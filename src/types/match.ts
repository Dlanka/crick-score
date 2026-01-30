/**
 * Batter statistics for a single player
 */
export type Batter = {
  /** Total runs scored by the batter */
  runs: number
  /** Total balls faced by the batter */
  balls: number
  /** Number of fours (boundaries worth 4 runs) hit by the batter */
  fours: number
  /** Number of sixes (boundaries worth 6 runs) hit by the batter */
  sixes: number
}

/**
 * Bowler statistics for a single player
 */
export type Bowler = {
  /** Total runs conceded by the bowler */
  runs: number
  /** Total balls bowled by the bowler */
  balls: number
  /** Total wickets taken by the bowler */
  wickets: number
  /** Number of maiden overs (overs with 0 runs) bowled */
  maidens: number
  /** Number of fours (boundaries worth 4 runs) conceded - legal deliveries only */
  fours: number
  /** Number of sixes (boundaries worth 6 runs) conceded - legal deliveries only */
  sixes: number
}

/**
 * Snapshot of state before a ball event (for undo functionality)
 */
export type BallEventSnapshot = {
  /** Player IDs at the time of the event */
  strikerId: string
  nonStrikerId: string
  bowlerId: string
  /** Bowler stats before this ball */
  bowlerBallsBefore: number
  bowlerRunsBefore: number
  bowlerWicketsBefore: number
  bowlerFoursBefore: number
  bowlerSixesBefore: number
  /** Striker stats before this ball */
  strikerRunsBefore: number
  strikerBallsBefore: number
  strikerFoursBefore: number
  strikerSixesBefore: number
  /** Score before this ball */
  scoreRunsBefore: number
  scoreWicketsBefore: number
  scoreBallsBefore: number
  /** Current over state before this ball */
  currentOverBallsBefore: number[]
  currentOverBallNumberBefore: number
  /** For wicket events: fallen batsman ID and new batter ID */
  fallenBatsmanId?: string
  newBatterId?: string
}

/**
 * Ball event in the match history
 * Stores snapshot of state before the event for reliable undo
 */
export type BallEvent = {
  type: 'run' | 'extra' | 'wicket' | 'retire'
  value?: number // Runs scored (for run events, or runs with wicket/extra events)
  kind?: string // Extra type (wide/noBall/byes/legByes) or wicket type
  /** Snapshot of state before this event - used for undo */
  snapshot: BallEventSnapshot
}

/**
 * Current over tracking
 * Tracks the balls in the current over being bowled
 */
export type CurrentOver = {
  /** Array of runs scored in each ball of the current over (0-6, or extras) */
  balls: number[]
  /** Current ball number in the over (0-5) */
  ballNumber: number
}

/**
 * Match status types
 */
export type MatchStatus = 'SETUP' | 'IN_PROGRESS' | 'COMPLETE' | 'ABANDONED'

/**
 * Snapshot of a single innings for summary display
 */
export type InningsRecord = {
  battingTeam: string
  bowlingTeam: string
  innings: number
  score: {
    runs: number
    wickets: number
    balls: number
  }
  batters: Record<string, Batter>
  bowlers: Record<string, Bowler>
  history: BallEvent[]
}

/**
 * Match state containing all match information
 */
export type MatchState = {
  teams: {
    teamA: string
    teamB: string
  }
  /** Maximum number of overs allowed in the match */
  oversLimit: number
  /** Name of the team currently batting */
  battingTeam: string
  /** Name of the team currently bowling */
  bowlingTeam: string

  /** Current innings number (1 for first innings, 2 for second innings) */
  innings: number

  /** Target score for the batting team (only relevant in second innings) */
  targetScore: number

  /** Match status: SETUP, IN_PROGRESS, or COMPLETE */
  matchStatus: MatchStatus

  score: {
    /** Total runs scored by the batting team */
    runs: number
    /** Total wickets fallen */
    wickets: number
    /** Total balls bowled (valid deliveries only) */
    balls: number
  }

  /** Tracking for the current over being bowled */
  currentOver: CurrentOver

  currentPlayers: {
    /** Name of the batter currently on strike */
    striker: string
    /** Name of the batter at the non-striker's end */
    nonStriker: string
    /** Name of the bowler currently bowling */
    bowler: string
  }

  /** Record of all batters and their statistics */
  batters: Record<string, Batter>
  /** Record of all bowlers and their statistics */
  bowlers: Record<string, Bowler>

  /** Complete history of all ball events in the match */
  history: BallEvent[]

  /** Completed innings records for summary display */
  inningsRecords: InningsRecord[]
}
