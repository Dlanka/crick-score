import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MatchState, BallEvent, BallEventSnapshot, Batter, Bowler, MatchStatus, InningsRecord } from '../types/match'

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
  addWicket: (kind: string, newBatterName: string, runOutBatsman?: string, runs?: number) => void
  undoLastBall: () => void
  swapBatters: () => void
  retireBatter: (retiringBatter: string, newBatterName: string, reason?: string) => void
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
  inningsRecords: [],
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
    fours: bowler?.fours ?? 0,
    sixes: bowler?.sixes ?? 0,
  }
}

/**
 * Create a snapshot of current state before a ball event
 * This snapshot is used for reliable undo functionality
 */
const createSnapshot = (state: MatchState): BallEventSnapshot => {
  const { striker, nonStriker, bowler } = state.currentPlayers
  const strikerStats = ensureBatter(state.batters[striker])
  const bowlerStats = ensureBowler(state.bowlers[bowler])
  
  return {
    strikerId: striker,
    nonStrikerId: nonStriker,
    bowlerId: bowler,
    bowlerBallsBefore: bowlerStats.balls,
    bowlerRunsBefore: bowlerStats.runs,
    bowlerWicketsBefore: bowlerStats.wickets,
    bowlerFoursBefore: bowlerStats.fours,
    bowlerSixesBefore: bowlerStats.sixes,
    strikerRunsBefore: strikerStats.runs,
    strikerBallsBefore: strikerStats.balls,
    strikerFoursBefore: strikerStats.fours,
    strikerSixesBefore: strikerStats.sixes,
    scoreRunsBefore: state.score.runs,
    scoreWicketsBefore: state.score.wickets,
    scoreBallsBefore: state.score.balls,
    currentOverBallsBefore: [...state.currentOver.balls],
    currentOverBallNumberBefore: state.currentOver.ballNumber,
  }
}

/**
 * Create an innings record for summary view
 */
const createInningsRecord = (state: MatchState): InningsRecord => {
  return {
    battingTeam: state.battingTeam,
    bowlingTeam: state.bowlingTeam,
    innings: state.innings,
    score: {
      runs: state.score.runs,
      wickets: state.score.wickets,
      balls: state.score.balls,
    },
    batters: { ...state.batters },
    bowlers: { ...state.bowlers },
    history: [...state.history],
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
            [config.bowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0, fours: 0, sixes: 0 },
          },
          history: [],
          inningsRecords: [],
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
        
        // Capture snapshot BEFORE making any changes
        const snapshot = createSnapshot(state)
        
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

        // Update bowler boundary stats - only for legal boundaries (4 or 6 runs)
        // Extras (wide, no ball, byes, leg byes) are NOT counted as boundaries
        const updatedBowler: Bowler = {
          runs: bowlerStats.runs + runs,
          balls: bowlerStats.balls + 1,
          wickets: bowlerStats.wickets,
          // Add maiden if previous over was completed with 0 runs
          maidens: wasPreviousOverMaiden ? bowlerStats.maidens + 1 : bowlerStats.maidens,
          // Increment fours/sixes ONLY for legal boundaries (runs === 4 or 6)
          // This is a legal delivery (addRun is only called for valid deliveries)
          fours: runs === 4 ? bowlerStats.fours + 1 : bowlerStats.fours,
          sixes: runs === 6 ? bowlerStats.sixes + 1 : bowlerStats.sixes,
        }

        // Determine strike rotation
        // Odd runs swap striker/non-striker, even runs keep same
        // Also swap at end of over (6 balls)
        const shouldSwapStrike = runs % 2 === 1 || isOverComplete
        const newStriker = shouldSwapStrike ? nonStriker : striker
        const newNonStriker = shouldSwapStrike ? striker : nonStriker

        // Create ball event with snapshot
        const event: BallEvent = {
          type: 'run',
          value: runs,
          snapshot,
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
        
        // Capture snapshot BEFORE making any changes
        const snapshot = createSnapshot(state)
        
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
          // IMPORTANT: Extras (wide, no ball, byes, leg byes) NEVER count as boundaries
          // Even if totalRuns is 4 or 6, these are extras, not legal boundaries
          fours: bowlerStats.fours,
          sixes: bowlerStats.sixes,
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
        } else if (type === 'noBall' && additionalRuns > 0) {
          // No Ball: runs off the bat count to the striker, but no ball faced
          const strikerStats = ensureBatter(state.batters[striker])
          updatedBatters[striker] = {
            ...strikerStats,
            runs: strikerStats.runs + additionalRuns,
            // Boundaries off a no-ball count for the batter
            fours: additionalRuns === 4 ? strikerStats.fours + 1 : strikerStats.fours,
            sixes: additionalRuns === 6 ? strikerStats.sixes + 1 : strikerStats.sixes,
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

        // Create ball event with snapshot
        const event: BallEvent = {
          type: 'extra',
          value: totalRuns,
          kind: type,
          snapshot,
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
       * - Runs can be scored with a wicket (e.g., caught off a boundary)
       */
      addWicket: (kind, newBatterName, runOutBatsman, runs = 0) => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        
        // Capture snapshot BEFORE making any changes
        const baseSnapshot = createSnapshot(state)
        
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
        
        // Ensure new batter name is provided (never use placeholder)
        const trimmedNewBatterName = newBatterName.trim()
        if (!trimmedNewBatterName) {
          // Invalid - cannot proceed without batter name
          return
        }
        
        // Create snapshot with wicket-specific data
        const snapshot: BallEventSnapshot = {
          ...baseSnapshot,
          fallenBatsmanId: fallenBatsman,
          newBatterId: trimmedNewBatterName,
        }
        
        const newBalls = state.score.balls + 1
        const isOverComplete = newBalls % 6 === 0

        // Update fallen batsman's stats (they faced the ball or were run out)
        const fallenBatsmanStats = ensureBatter(state.batters[fallenBatsman])
        const updatedFallenBatsman: Batter = {
          ...fallenBatsmanStats,
          runs: fallenBatsmanStats.runs + runs,
          balls: fallenBatsmanStats.balls + 1,
          fours: runs === 4 ? fallenBatsmanStats.fours + 1 : fallenBatsmanStats.fours,
          sixes: runs === 6 ? fallenBatsmanStats.sixes + 1 : fallenBatsmanStats.sixes,
        }

        // Update bowler's stats
        // Note: Run Out, Stumping, and Hit Wicket don't count against bowler's wickets
        const bowlerStats = ensureBowler(state.bowlers[bowler])
        const isBowlerWicket = !isRunOut && kind !== 'stumping' && kind !== 'hitWicket'
        
        // Track runs for maiden calculation
        const currentBallInOver = bowlerStats.balls % 6
        const isNewOver = currentBallInOver === 0
        const wasPreviousOverMaiden = isNewOver && bowlerStats.balls > 0 && 
          state.currentOver.balls.length === 6 &&
          state.currentOver.balls.reduce((sum, r) => sum + r, 0) === 0
        
        const updatedBowler: Bowler = {
          ...bowlerStats,
          runs: bowlerStats.runs + runs,
          balls: bowlerStats.balls + 1,
          wickets: isBowlerWicket ? bowlerStats.wickets + 1 : bowlerStats.wickets,
          maidens: wasPreviousOverMaiden ? bowlerStats.maidens + 1 : bowlerStats.maidens,
          // Increment fours/sixes ONLY for legal boundaries (runs === 4 or 6)
          // Wicket ball with runs can have boundaries if runs are scored off the bat
          fours: runs === 4 ? bowlerStats.fours + 1 : bowlerStats.fours,
          sixes: runs === 6 ? bowlerStats.sixes + 1 : bowlerStats.sixes,
        }

        // Update current over tracking
        const newOverBalls = [...state.currentOver.balls]
        if (isNewOver) {
          newOverBalls.length = 0 // Start new over
        }
        newOverBalls.push(runs) // Wicket ball with runs

        // Create ball event (wicket with runs) with snapshot
        const event: BallEvent = {
          type: 'wicket',
          kind: kind,
          value: runs, // Store runs with wicket event
          snapshot,
        }

        // Use the trimmed new batter name (never use placeholder)
        const newBatter = trimmedNewBatterName
        
        // Determine new striker and non-striker positions
        // Strike rotation: Odd runs swap, even runs keep same (but new batter always takes fallen batsman's position)
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
          // If runs were scored, handle strike rotation
          if (runs > 0 && runs % 2 === 1) {
            // Odd runs: swap positions
            newStriker = remainingBatsman
            newNonStriker = newBatter
          } else {
            // Even runs or 0: new batter takes striker position
            newStriker = newBatter
            newNonStriker = remainingBatsman
          }
        }
        
        // Also swap at end of over
        if (isOverComplete) {
          const temp = newStriker
          newStriker = newNonStriker
          newNonStriker = temp
        }

        set({
          score: {
            runs: state.score.runs + runs,
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
       * Undo last ball - restores state from snapshot
       * 
       * Snapshot-based undo ensures:
       * - Exact restoration of previous state (no recalculation)
       * - Bowler balls never increment incorrectly
       * - Batter names never reset
       * - Deterministic and reliable undo
       */
      undoLastBall: () => {
        const state = get()
        if (state.history.length === 0) return

        // Get the last event and its snapshot
        const lastEvent = state.history[state.history.length - 1]
        const snapshot = lastEvent.snapshot

        // Restore bowler stats from snapshot (never recalculate)
        const updatedBowlers = { ...state.bowlers }
        if (updatedBowlers[snapshot.bowlerId]) {
          updatedBowlers[snapshot.bowlerId] = {
            ...updatedBowlers[snapshot.bowlerId],
            balls: snapshot.bowlerBallsBefore,
            runs: snapshot.bowlerRunsBefore,
            wickets: snapshot.bowlerWicketsBefore,
            // Restore boundary stats from snapshot (never recalculate)
            fours: snapshot.bowlerFoursBefore,
            sixes: snapshot.bowlerSixesBefore,
            // Maidens need to be recalculated from remaining history
            // But for now, preserve current value to avoid corruption
            maidens: state.bowlers[snapshot.bowlerId]?.maidens ?? 0,
          }
        }

        // Restore striker stats from snapshot
        const updatedBatters = { ...state.batters }
        if (updatedBatters[snapshot.strikerId]) {
          updatedBatters[snapshot.strikerId] = {
            runs: snapshot.strikerRunsBefore,
            balls: snapshot.strikerBallsBefore,
            fours: snapshot.strikerFoursBefore,
            sixes: snapshot.strikerSixesBefore,
          }
        }

        // For wicket/retire events, remove the new batter if it was added
        if ((lastEvent.type === 'wicket' || lastEvent.type === 'retire') && snapshot.newBatterId) {
          // Only remove if this was the only event (new batter has no stats)
          // Otherwise keep the batter in case they have stats from other events
          const newBatterStats = updatedBatters[snapshot.newBatterId]
          if (newBatterStats && 
              newBatterStats.runs === 0 && 
              newBatterStats.balls === 0 && 
              newBatterStats.fours === 0 && 
              newBatterStats.sixes === 0) {
            // Safe to remove - this batter was only added in this event
            delete updatedBatters[snapshot.newBatterId]
          }
        }

        // Restore score from snapshot
        const restoredScore = {
          runs: snapshot.scoreRunsBefore,
          wickets: snapshot.scoreWicketsBefore,
          balls: snapshot.scoreBallsBefore,
        }

        // Restore current over from snapshot
        const restoredOver = {
          balls: [...snapshot.currentOverBallsBefore],
          ballNumber: snapshot.currentOverBallNumberBefore,
        }

        // Restore current players from snapshot
        const restoredPlayers = {
          striker: snapshot.strikerId,
          nonStriker: snapshot.nonStrikerId,
          bowler: snapshot.bowlerId,
        }

        // Remove last event from history
        const newHistory = state.history.slice(0, -1)

        // Update state with restored values
        set({
          ...state,
          score: restoredScore,
          currentOver: restoredOver,
          currentPlayers: restoredPlayers,
          batters: updatedBatters,
          bowlers: updatedBowlers,
          history: newHistory,
        })
      },

      /**
       * Swap striker and non-striker
       */
      swapBatters: () => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        if (!striker || !nonStriker) return

        set({
          currentPlayers: {
            striker: nonStriker,
            nonStriker: striker,
            bowler,
          },
        })
      },

      /**
       * Retire a batter without counting a ball
       */
      retireBatter: (retiringBatter, newBatterName, reason) => {
        const state = get()
        const { striker, nonStriker, bowler } = state.currentPlayers
        const trimmedNewBatterName = newBatterName.trim()
        if (!retiringBatter || !trimmedNewBatterName) return

        // Capture snapshot BEFORE making any changes
        const snapshot = createSnapshot(state)

        const updatedBatters = { ...state.batters }
        updatedBatters[trimmedNewBatterName] = {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        }

        const updatedPlayers = {
          striker: retiringBatter === striker ? trimmedNewBatterName : striker,
          nonStriker: retiringBatter === nonStriker ? trimmedNewBatterName : nonStriker,
          bowler,
        }

        const event: BallEvent = {
          type: 'retire',
          kind: reason?.trim() || 'retire',
          snapshot: {
            ...snapshot,
            fallenBatsmanId: retiringBatter,
            newBatterId: trimmedNewBatterName,
          },
        }

        set({
          currentPlayers: updatedPlayers,
          batters: updatedBatters,
          history: [...state.history, event],
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
        const completedInnings = createInningsRecord(state)

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
            [bowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0, fours: 0, sixes: 0 },
          },
          history: [],
          inningsRecords: [...state.inningsRecords, completedInnings],
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

        const completedInnings = createInningsRecord(state)

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
          inningsRecords: [...state.inningsRecords, completedInnings],
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
          [trimmedBowler]: { runs: 0, balls: 0, wickets: 0, maidens: 0, fours: 0, sixes: 0 },
        }

        const completedInnings = createInningsRecord(state)

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
          inningsRecords: [...state.inningsRecords, completedInnings],
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
          updatedBowlers[trimmedName] = { runs: 0, balls: 0, wickets: 0, maidens: 0, fours: 0, sixes: 0 }
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
