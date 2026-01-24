import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MatchState, BallEvent, Batter, Bowler, MatchStatus } from '../types/match'

interface MatchConfig {
  teamA: string
  teamB: string
  oversLimit: number
  striker: string
  nonStriker: string
  bowler: string
}

interface MatchStore extends MatchState {
  // Actions
  startMatch: (config: MatchConfig) => void
  addRun: (runs: number) => void
  addExtra: (type: 'wide' | 'noBall' | 'byes' | 'legByes', runs?: number) => void
  addWicket: (kind: string, newBatterName: string, runOutBatsman?: string) => void
  undoLastBall: () => void
  startSecondInnings: (striker: string, nonStriker: string, bowler: string) => void
  forceSkipFirstInnings: (target: number) => void
  skipFirstInningsWithSetup: (target: number, striker: string, nonStriker: string, bowler: string) => void
  setBowler: (bowlerName: string) => void
  setMatchStatus: (status: MatchStatus) => void
  abandonMatch: () => void
  resetMatch: () => void
}

const initialState: MatchState = {
  teams: {
    teamA: '',
    teamB: '',
  },
  oversLimit: 0,
  battingTeam: '',
  bowlingTeam: '',
  innings: 1,
  targetScore: 0,
  matchStatus: 'SETUP',
  score: {
    runs: 0,
    wickets: 0,
    balls: 0,
  },
  currentOver: {
    balls: [],
    ballNumber: 0,
  },
  currentPlayers: {
    striker: '',
    nonStriker: '',
    bowler: '',
  },
  batters: {},
  bowlers: {},
  history: [],
}

/**
 * Helper function to ensure batter has all required fields
 */
const ensureBatter = (batter: Partial<Batter> | undefined): Batter => {
  return {
    runs: batter?.runs ?? 0,
    balls: batter?.balls ?? 0,
    fours: batter?.fours ?? 0,
    sixes: batter?.sixes ?? 0,
  }
}

/**
 * Helper function to ensure bowler has all required fields
 */
const ensureBowler = (bowler: Partial<Bowler> | undefined): Bowler => {
  return {
    runs: bowler?.runs ?? 0,
    balls: bowler?.balls ?? 0,
    wickets: bowler?.wickets ?? 0,
    maidens: bowler?.maidens ?? 0,
  }
}


/**
 * Recompute state from history
 * Used for undo functionality - safely rebuilds state from scratch
 */
const recomputeStateFromHistory = (
  initialState: MatchState,
  history: BallEvent[]
): MatchState => {
  let state = { ...initialState }
  const batters: Record<string, Batter> = {}
  const bowlers: Record<string, Bowler> = {}

  // Track runs per over for maiden calculation
  const bowlerOverRuns: Record<string, number[]> = {}

  for (const event of history) {
    const { striker, nonStriker, bowler } = state.currentPlayers

    if (event.type === 'run' && event.value !== undefined) {
      const runs = event.value
      const newBalls = state.score.balls + 1
      const isOverComplete = newBalls % 6 === 0

      // Update batter
      const batter = ensureBatter(batters[striker])
      batters[striker] = {
        runs: batter.runs + runs,
        balls: batter.balls + 1,
        fours: runs === 4 ? batter.fours + 1 : batter.fours,
        sixes: runs === 6 ? batter.sixes + 1 : batter.sixes,
      }

      // Update bowler
      const bowlerStats = ensureBowler(bowlers[bowler])
      if (!bowlerOverRuns[bowler]) bowlerOverRuns[bowler] = []
      const currentOverIndex = Math.floor(bowlerStats.balls / 6)
      if (!bowlerOverRuns[bowler][currentOverIndex]) {
        bowlerOverRuns[bowler][currentOverIndex] = 0
      }
      bowlerOverRuns[bowler][currentOverIndex] += runs

      bowlers[bowler] = {
        runs: bowlerStats.runs + runs,
        balls: bowlerStats.balls + 1,
        wickets: bowlerStats.wickets,
        maidens: bowlerStats.maidens,
      }

      // Update current over
      const currentBallInOver = bowlerStats.balls % 6
      const newOverBalls = [...state.currentOver.balls]
      if (newOverBalls.length <= currentBallInOver) {
        newOverBalls.push(runs)
      } else {
        newOverBalls[currentBallInOver] = runs
      }

      state = {
        ...state,
        score: {
          runs: state.score.runs + runs,
          wickets: state.score.wickets,
          balls: newBalls,
        },
        currentOver: {
          balls: isOverComplete ? [] : newOverBalls,
          ballNumber: isOverComplete ? 0 : currentBallInOver + 1,
        },
        currentPlayers: {
          striker: (runs % 2 === 1 || isOverComplete) ? nonStriker : striker,
          nonStriker: (runs % 2 === 1 || isOverComplete) ? striker : nonStriker,
          bowler,
        },
      }
    } else if (event.type === 'extra') {
      const totalRuns = event.value ?? 1
      const kind = event.kind as 'wide' | 'noBall' | 'byes' | 'legByes'
      const ballCounts = kind === 'byes' || kind === 'legByes'
      const newBalls = ballCounts ? state.score.balls + 1 : state.score.balls
      const isOverComplete = ballCounts && newBalls % 6 === 0

      // Update bowler
      const bowlerStats = ensureBowler(bowlers[bowler])
      if (ballCounts && !bowlerOverRuns[bowler]) bowlerOverRuns[bowler] = []
      if (ballCounts) {
        const currentOverIndex = Math.floor(bowlerStats.balls / 6)
        if (!bowlerOverRuns[bowler][currentOverIndex]) {
          bowlerOverRuns[bowler][currentOverIndex] = 0
        }
        bowlerOverRuns[bowler][currentOverIndex] += totalRuns
      }

      bowlers[bowler] = {
        runs: bowlerStats.runs + totalRuns,
        balls: ballCounts ? bowlerStats.balls + 1 : bowlerStats.balls,
        wickets: bowlerStats.wickets,
        maidens: bowlerStats.maidens,
      }

      // Update batter if ball counts
      if (ballCounts) {
        const batter = ensureBatter(batters[striker])
        batters[striker] = {
          ...batter,
          balls: batter.balls + 1,
        }
      }

      state = {
        ...state,
        score: {
          runs: state.score.runs + totalRuns,
          wickets: state.score.wickets,
          balls: newBalls,
        },
        currentOver: ballCounts
          ? {
              balls: isOverComplete ? [] : [...state.currentOver.balls, totalRuns],
              ballNumber: isOverComplete ? 0 : state.currentOver.ballNumber + 1,
            }
          : state.currentOver,
        currentPlayers: {
          striker: (event.value && event.value % 2 === 1) || isOverComplete ? nonStriker : striker,
          nonStriker: (event.value && event.value % 2 === 1) || isOverComplete ? striker : nonStriker,
          bowler,
        },
      }
    } else if (event.type === 'wicket') {
      const newBalls = state.score.balls + 1
      const isOverComplete = newBalls % 6 === 0

      // Update batter
      const batter = ensureBatter(batters[striker])
      batters[striker] = {
        ...batter,
        balls: batter.balls + 1,
      }

      // Update bowler
      const bowlerStats = ensureBowler(bowlers[bowler])
      if (!bowlerOverRuns[bowler]) bowlerOverRuns[bowler] = []
      const currentOverIndex = Math.floor(bowlerStats.balls / 6)
      if (!bowlerOverRuns[bowler][currentOverIndex]) {
        bowlerOverRuns[bowler][currentOverIndex] = 0
      }

      const isRunOutType = event.kind === 'runOutStriker' || event.kind === 'runOutNonStriker'
      bowlers[bowler] = {
        runs: bowlerStats.runs,
        balls: bowlerStats.balls + 1,
        wickets: isRunOutType ? bowlerStats.wickets : bowlerStats.wickets + 1,
        maidens: bowlerStats.maidens,
      }

      // Find new striker from history (would need to track this)
      // For now, use a placeholder
      const newStriker = `Batter ${state.score.wickets + 1}`
      batters[newStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0 }

      state = {
        ...state,
        score: {
          runs: state.score.runs,
          wickets: state.score.wickets + 1,
          balls: newBalls,
        },
        currentOver: {
          balls: isOverComplete ? [] : [...state.currentOver.balls, 0],
          ballNumber: isOverComplete ? 0 : state.currentOver.ballNumber + 1,
        },
        currentPlayers: {
          striker: newStriker,
          nonStriker: state.currentPlayers.nonStriker,
          bowler,
        },
      }
    }
  }

  // Calculate maidens after recomputing
  for (const [bowlerName, overRuns] of Object.entries(bowlerOverRuns)) {
    const bowler = bowlers[bowlerName]
    if (bowler) {
      let maidens = 0
      for (let i = 0; i < overRuns.length; i++) {
        if (overRuns[i] === 0) maidens++
      }
      bowlers[bowlerName] = { ...bowler, maidens }
    }
  }

  return {
    ...state,
    batters,
    bowlers,
  }
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize a new match with teams, overs limit, and starting players
       * Sets up the batting team (teamA) and bowling team (teamB)
       * Initializes player records for batters and bowlers
       */
      startMatch: (config) => {
        set({
          teams: {
            teamA: config.teamA,
            teamB: config.teamB,
          },
          oversLimit: config.oversLimit,
          battingTeam: config.teamA, // Team A bats first
          bowlingTeam: config.teamB, // Team B bowls first
          innings: 1,
          targetScore: 0,
          matchStatus: 'IN_PROGRESS',
          score: {
            runs: 0,
            wickets: 0,
            balls: 0,
          },
          currentOver: {
            balls: [],
            ballNumber: 0,
          },
          currentPlayers: {
            striker: config.striker,
            nonStriker: config.nonStriker,
            bowler: config.bowler,
          },
          batters: {
            [config.striker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            [config.nonStriker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          },
          bowlers: {
            [config.bowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0 },
          },
          history: [],
        })
      },

      /**
       * Add runs scored from a valid delivery
       * 
       * Cricket logic:
       * - Runs are added to total score
       * - Striker's runs, balls, fours, and sixes are updated
       * - Bowler's runs and balls are updated
       * - Strike rotation: Odd runs (1, 3, 5) swap striker/non-striker
       * - Even runs (0, 2, 4, 6) keep same striker
       * - Ball count increments (valid delivery)
       * - After 6 balls (1 over), striker/non-striker swap automatically
       * - Current over is tracked ball-by-ball
       * - Maiden overs are tracked (overs with 0 runs)
       */
      addRun: (runs) => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        const newBalls = state.score.balls + 1
        const isOverComplete = newBalls % 6 === 0

        // Update striker's stats
        const strikerStats = ensureBatter(state.batters[striker])
        const updatedStriker: Batter = {
          runs: strikerStats.runs + runs,
          balls: strikerStats.balls + 1,
          fours: runs === 4 ? strikerStats.fours + 1 : strikerStats.fours,
          sixes: runs === 6 ? strikerStats.sixes + 1 : strikerStats.sixes,
        }

        // Update bowler's stats
        const bowlerStats = ensureBowler(state.bowlers[bowler])
        const currentBallInOver = bowlerStats.balls % 6
        const isNewOver = currentBallInOver === 0

        // Check if previous over was a maiden (before adding this ball)
        // A maiden is an over with 0 runs after 6 balls
        const wasPreviousOverMaiden = isNewOver && bowlerStats.balls > 0 && 
          state.currentOver.balls.length === 6 &&
          state.currentOver.balls.reduce((sum, r) => sum + r, 0) === 0

        // Update current over tracking
        const newOverBalls = [...state.currentOver.balls]
        if (isNewOver) {
          newOverBalls.length = 0 // Start new over
        }
        newOverBalls.push(runs)

        const updatedBowler: Bowler = {
          runs: bowlerStats.runs + runs,
          balls: bowlerStats.balls + 1,
          wickets: bowlerStats.wickets,
          // Add maiden if previous over was completed with 0 runs
          maidens: wasPreviousOverMaiden ? bowlerStats.maidens + 1 : bowlerStats.maidens,
        }

        // Determine strike rotation
        // Odd runs swap striker/non-striker, even runs keep same
        // Also swap at end of over (6 balls)
        const shouldSwapStrike = runs % 2 === 1 || isOverComplete
        const newStriker = shouldSwapStrike ? nonStriker : striker
        const newNonStriker = shouldSwapStrike ? striker : nonStriker

        // Create ball event
        const event: BallEvent = {
          type: 'run',
          value: runs,
        }

        set({
          score: {
            runs: state.score.runs + runs,
            wickets: state.score.wickets,
            balls: newBalls,
          },
          currentOver: {
            balls: isOverComplete ? [] : newOverBalls,
            ballNumber: isOverComplete ? 0 : newOverBalls.length,
          },
          currentPlayers: {
            striker: newStriker,
            nonStriker: newNonStriker,
            bowler,
          },
          batters: {
            ...state.batters,
            [striker]: updatedStriker,
            [nonStriker]: ensureBatter(state.batters[nonStriker]),
          },
          bowlers: {
            ...state.bowlers,
            [bowler]: updatedBowler,
          },
          history: [...state.history, event],
        })
      },

      /**
       * Add extras (Wide, No Ball, Byes, Leg Byes)
       * 
       * Cricket logic:
       * - Wide/No Ball: Add 1 run, does NOT count as a ball (no ball count)
       * - Byes/Leg Byes: Add runs, DOES count as a ball (ball counts)
       * - Extras add runs to score (plus any additional runs if scored)
       * - Bowler's runs increase
       * - For Wide/No Ball: Bowler's balls do NOT increase, current over not updated
       * - For Byes/Leg Byes: Bowler's balls DO increase (valid delivery), current over updated
       * - Striker's balls increase only for Byes/Leg Byes
       * - Strike rotates on odd runs (only if runs were scored)
       * - Strike rotates at end of over
       */
      addExtra: (type, additionalRuns = 0) => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        
        // Calculate total runs based on extra type
        // Wide/No Ball: 1 (penalty) + additional runs
        // Byes/Leg Byes: additionalRuns is the total runs (no inherent penalty)
        const totalRuns = (type === 'byes' || type === 'legByes') 
          ? additionalRuns 
          : (1 + additionalRuns) // 1 for extra + any additional runs

        // Determine if ball counts based on extra type
        // Wide and No Ball don't count as balls
        // Byes and Leg Byes count as balls (valid deliveries)
        const ballCounts = type === 'byes' || type === 'legByes'
        const newBalls = ballCounts ? state.score.balls + 1 : state.score.balls
        const isOverComplete = ballCounts && newBalls % 6 === 0

        // Update bowler's stats
        const bowlerStats = ensureBowler(state.bowlers[bowler])
        const updatedBowler: Bowler = {
          runs: bowlerStats.runs + totalRuns,
          // Balls increase only for Byes/Leg Byes
          balls: ballCounts ? bowlerStats.balls + 1 : bowlerStats.balls,
          wickets: bowlerStats.wickets,
          maidens: bowlerStats.maidens, // Maidens handled in addRun
        }

        // Update current over tracking (only for Byes/Leg Byes)
        let newOverBalls = [...state.currentOver.balls]
        let newBallNumber = state.currentOver.ballNumber

        if (ballCounts) {
          if (isOverComplete) {
            newOverBalls = []
            newBallNumber = 0
          } else {
            newOverBalls.push(totalRuns)
            newBallNumber = newOverBalls.length
          }
        }

        // Update batter stats
        const updatedBatters = { ...state.batters }
        let newStriker = striker
        let newNonStriker = nonStriker

        if (ballCounts) {
          // For Byes/Leg Byes, update striker's balls faced
          const strikerStats = ensureBatter(state.batters[striker])
          updatedBatters[striker] = {
            ...strikerStats,
            balls: strikerStats.balls + 1,
            // Runs don't count to batter for byes/leg byes (they're extras)
          }
        }

        // Ensure non-striker exists
        updatedBatters[nonStriker] = ensureBatter(state.batters[nonStriker])

        // If additional runs were scored, handle strike rotation
        // Strike rotates on odd runs or at end of over
        if (additionalRuns > 0 || isOverComplete) {
          const shouldSwapStrike = additionalRuns % 2 === 1 || isOverComplete
          if (shouldSwapStrike) {
            newStriker = nonStriker
            newNonStriker = striker
          }
        }

        // Create ball event
        const event: BallEvent = {
          type: 'extra',
          value: totalRuns,
          kind: type,
        }

        set({
          score: {
            runs: state.score.runs + totalRuns,
            wickets: state.score.wickets,
            balls: newBalls, // Counts for Byes/Leg Byes, not for Wide/No Ball
          },
          currentOver: {
            balls: newOverBalls,
            ballNumber: newBallNumber,
          },
          currentPlayers: {
            striker: newStriker,
            nonStriker: newNonStriker,
            bowler,
          },
          bowlers: {
            ...state.bowlers,
            [bowler]: updatedBowler,
          },
          batters: updatedBatters,
          history: [...state.history, event],
        })
      },

      /**
       * Add a wicket (dismissal)
       * 
       * Cricket logic:
       * - Wicket count increases
       * - Bowler's wickets increase (except for Run Out)
       * - Bowler's balls increase (wicket ball counts as a delivery)
       * - Striker's balls increase (they faced the ball)
       * - New batter comes in (striker position)
       * - Strike does NOT rotate on wicket (new batter takes striker position)
       * - Current over is updated
       * - If 10 wickets fall, innings is complete
       */
      addWicket: (kind, newBatterName, runOutBatsman) => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        const newBalls = state.score.balls + 1
        const isOverComplete = newBalls % 6 === 0

        // Determine if this is a run-out type
        const isRunOut = kind === 'runOutStriker' || kind === 'runOutNonStriker'
        
        // Determine which batsman is out
        let fallenBatsman: string
        let remainingBatsman: string
        
        if (isRunOut && runOutBatsman) {
          // For run-outs, use the selected batsman
          fallenBatsman = runOutBatsman
          remainingBatsman = fallenBatsman === striker ? nonStriker : striker
        } else {
          // For all other wicket types, striker is out
          fallenBatsman = striker
          remainingBatsman = nonStriker
        }

        // Update fallen batsman's stats (they faced the ball or were run out)
        const fallenBatsmanStats = ensureBatter(state.batters[fallenBatsman])
        const updatedFallenBatsman: Batter = {
          ...fallenBatsmanStats,
          balls: fallenBatsmanStats.balls + 1,
        }

        // Update bowler's stats
        // Note: Run Out, Stumping, and Hit Wicket don't count against bowler's wickets
        const bowlerStats = ensureBowler(state.bowlers[bowler])
        const isBowlerWicket = !isRunOut && kind !== 'stumping' && kind !== 'hitWicket'
        const updatedBowler: Bowler = {
          ...bowlerStats,
          balls: bowlerStats.balls + 1,
          wickets: isBowlerWicket ? bowlerStats.wickets + 1 : bowlerStats.wickets,
          maidens: bowlerStats.maidens,
        }

        // Update current over tracking
        const newOverBalls = [...state.currentOver.balls]
        if (isOverComplete) {
          newOverBalls.length = 0
        } else {
          newOverBalls.push(0) // Wicket = 0 runs
        }

        // Create ball event
        const event: BallEvent = {
          type: 'wicket',
          kind: kind,
        }

        // New batter takes the position of the fallen batsman
        const newBatter = newBatterName.trim() || `Batter ${state.score.wickets + 1}`
        
        // Determine new striker and non-striker positions
        let newStriker: string
        let newNonStriker: string
        
        if (isRunOut && runOutBatsman) {
          // For run-outs, the new batter takes the position of the fallen batsman
          if (fallenBatsman === striker) {
            newStriker = newBatter
            newNonStriker = remainingBatsman
          } else {
            newStriker = remainingBatsman
            newNonStriker = newBatter
          }
        } else {
          // For other wickets, new batter takes striker position
          newStriker = newBatter
          newNonStriker = remainingBatsman
        }

        set({
          score: {
            runs: state.score.runs,
            wickets: state.score.wickets + 1,
            balls: newBalls,
          },
          currentOver: {
            balls: isOverComplete ? [] : newOverBalls,
            ballNumber: isOverComplete ? 0 : newOverBalls.length,
          },
          currentPlayers: {
            striker: newStriker,
            nonStriker: newNonStriker,
            bowler,
          },
          batters: {
            ...state.batters,
            [fallenBatsman]: updatedFallenBatsman,
            [newBatter]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          },
          bowlers: {
            ...state.bowlers,
            [bowler]: updatedBowler,
          },
          history: [...state.history, event],
        })
      },

      /**
       * Undo last ball - safely recomputes state from history
       * 
       * Cricket logic:
       * - Removes last event from history
       * - Recomputes entire state from remaining history
       * - Ensures all stats are consistent
       * - Handles current over tracking correctly
       */
      undoLastBall: () => {
        const state = get()
        if (state.history.length === 0) return

        // Remove last event
        const newHistory = state.history.slice(0, -1)

        // Recompute state from history
        const recomputedState = recomputeStateFromHistory(
          {
            ...initialState,
            teams: state.teams,
            oversLimit: state.oversLimit,
            battingTeam: state.battingTeam,
            bowlingTeam: state.bowlingTeam,
            innings: state.innings,
            targetScore: state.targetScore,
            matchStatus: state.matchStatus,
            currentPlayers: state.currentPlayers,
          },
          newHistory
        )

        set({
          ...recomputedState,
          history: newHistory,
        })
      },

      /**
       * Start second innings
       * 
       * Cricket logic:
       * - Swaps batting and bowling teams
       * - Sets target score (first innings total + 1)
       * - Resets score, wickets, balls
       * - Resets current over
       * - Increments innings to 2
       * - Sets new starting players for second innings
       * - Clears batter/bowler stats for new innings
       * - Does NOT reset teams or overs limit
       */
      startSecondInnings: (striker, nonStriker, bowler) => {
        const state = get()
        const firstInningsScore = state.score.runs

        set({
          innings: 2,
          targetScore: firstInningsScore + 1, // Target is first innings score + 1
          battingTeam: state.bowlingTeam, // Teams swap
          bowlingTeam: state.battingTeam,
          score: {
            runs: 0,
            wickets: 0,
            balls: 0,
          },
          currentOver: {
            balls: [],
            ballNumber: 0,
          },
          currentPlayers: {
            striker,
            nonStriker,
            bowler,
          },
          // Reset players for second innings
          batters: {
            [striker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
            [nonStriker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          },
          bowlers: {
            [bowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0 },
          },
          history: [],
        })
      },

      /**
       * Force skip first innings with a target score
       * 
       * Cricket logic:
       * - Ends first innings immediately
       * - Sets innings to 2
       * - Sets target score to provided value
       * - Swaps batting and bowling teams
       * - Resets score, wickets, balls, current over
       * - Clears batter/bowler stats for second innings
       * - Sets match status to IN_PROGRESS
       * - Does NOT reset teams or overs limit
       * - First innings data remains in history for scorecard display
       */
      forceSkipFirstInnings: (target) => {
        const state = get()
        
        // Validate: Only allow if in first innings
        if (state.innings !== 1) {
          return // Cannot skip if not in first innings
        }
        
        // Validate: Target must be positive
        if (target <= 0) {
          return // Invalid target
        }

        set({
          innings: 2,
          targetScore: target,
          battingTeam: state.bowlingTeam, // Teams swap
          bowlingTeam: state.battingTeam,
          score: {
            runs: 0,
            wickets: 0,
            balls: 0,
          },
          currentOver: {
            balls: [],
            ballNumber: 0,
          },
          currentPlayers: {
            striker: '',
            nonStriker: '',
            bowler: '',
          },
          batters: {},
          bowlers: {},
          // Keep history intact for scorecard display
          matchStatus: 'IN_PROGRESS',
        })
      },

      /**
       * Skip first innings and start second innings with player setup
       * Sets target, initializes second innings players, and resets scoring
       */
      skipFirstInningsWithSetup: (target, striker, nonStriker, bowler) => {
        const state = get()
        
        // Validate: Only allow if in first innings
        if (state.innings !== 1) {
          return // Cannot skip if not in first innings
        }
        
        // Validate: Target must be positive
        if (target <= 0) {
          return // Invalid target
        }

        // Validate: All player names must be provided
        const trimmedStriker = striker.trim()
        const trimmedNonStriker = nonStriker.trim()
        const trimmedBowler = bowler.trim()

        if (!trimmedStriker || !trimmedNonStriker || !trimmedBowler) {
          return // Missing required player names
        }

        // Validate: Striker and non-striker must be different
        if (trimmedStriker.toLowerCase() === trimmedNonStriker.toLowerCase()) {
          return // Duplicate batter names
        }

        // Initialize batters for second innings
        const newBatters: Record<string, Batter> = {
          [trimmedStriker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          [trimmedNonStriker]: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        }

        // Initialize bowler for second innings
        const newBowlers: Record<string, Bowler> = {
          [trimmedBowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0 },
        }

        set({
          innings: 2,
          targetScore: target,
          battingTeam: state.bowlingTeam, // Teams swap
          bowlingTeam: state.battingTeam,
          score: {
            runs: 0,
            wickets: 0,
            balls: 0,
          },
          currentOver: {
            balls: [],
            ballNumber: 0,
          },
          currentPlayers: {
            striker: trimmedStriker,
            nonStriker: trimmedNonStriker,
            bowler: trimmedBowler,
          },
          batters: newBatters,
          bowlers: newBowlers,
          // Keep history intact for scorecard display
          matchStatus: 'IN_PROGRESS',
        })
      },

      /**
       * Set current bowler
       * Adds bowler to bowlers list if not already present
       */
      setBowler: (bowlerName) => {
        const state = get()
        const trimmedName = bowlerName.trim()
        
        if (!trimmedName) return

        // Add bowler to bowlers list if not already present
        const updatedBowlers = { ...state.bowlers }
        if (!updatedBowlers[trimmedName]) {
          updatedBowlers[trimmedName] = { runs: 0, balls: 0, wickets: 0, maidens: 0 }
        }

        set({
          currentPlayers: {
            ...state.currentPlayers,
            bowler: trimmedName,
          },
          bowlers: updatedBowlers,
        })
      },

      /**
       * Set match status
       */
      setMatchStatus: (status) => {
        set({ matchStatus: status })
      },

      /**
       * Abandon the current match
       * Sets match status to ABANDONED and freezes all scoring
       * Keeps scorecard data for viewing
       */
      abandonMatch: () => {
        set({ matchStatus: 'ABANDONED' })
      },

      /**
       * Reset match to initial state
       * Clears all match data and returns to setup state
       * Also clears localStorage to ensure no leftover state
       */
      resetMatch: () => {
        // Clear localStorage for the persist key
        localStorage.removeItem('cricket_match_v1')
        // Reset to initial state
        set(initialState)
      },
    }),
    {
      name: 'cricket_match_v1', // Persist key
    }
  )
)
