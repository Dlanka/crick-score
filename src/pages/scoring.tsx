import { useEffect, useState, useRef } from "react";
import { ArrowDownUp, Undo2, UserX } from "lucide-react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ScoreBoard } from "../components/ScoreBoard";
import { CurrentOver } from "../components/CurrentOver";
import { CurrentPlayersStats } from "../components/CurrentPlayersStats";
import { RunButtons } from "../components/RunButtons";
import { ScoringControls, WicketType } from "../components/ScoringControls";
import { SelectBowlerModal } from "../components/SelectBowlerModal";
import { useMatchStore } from "../store/matchStore";

export function ScoringPage() {
  const navigate = useNavigate();
  const battingTeam = useMatchStore((state) => state.battingTeam);
  const teams = useMatchStore((state) => state.teams);
  const innings = useMatchStore((state) => state.innings);
  const score = useMatchStore((state) => state.score);
  const oversLimit = useMatchStore((state) => state.oversLimit);
  const targetScore = useMatchStore((state) => state.targetScore);
  const currentPlayers = useMatchStore((state) => state.currentPlayers);
  const startSecondInnings = useMatchStore((state) => state.startSecondInnings);
  const skipFirstInningsWithSetup = useMatchStore(
    (state) => state.skipFirstInningsWithSetup,
  );
  const bowlers = useMatchStore((state) => state.bowlers);
  const undoLastBall = useMatchStore((state) => state.undoLastBall);
  const setMatchStatus = useMatchStore((state) => state.setMatchStatus);
  const swapBatters = useMatchStore((state) => state.swapBatters);
  const retireBatter = useMatchStore((state) => state.retireBatter);
  const addWicket = useMatchStore((state) => state.addWicket);
  const addExtra = useMatchStore((state) => state.addExtra);
  const addRun = useMatchStore((state) => state.addRun);
  const resetMatch = useMatchStore((state) => state.resetMatch);
  const abandonMatch = useMatchStore((state) => state.abandonMatch);
  const setBowlerAction = useMatchStore((state) => state.setBowler);
  const history = useMatchStore((state) => state.history);
  const matchStatus = useMatchStore((state) => state.matchStatus);
  const currentOver = useMatchStore((state) => state.currentOver);

  const [showSecondInningsModal, setShowSecondInningsModal] = useState(false);
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  // Select Bowler Modal state
  const [showSelectBowlerModal, setShowSelectBowlerModal] = useState(false);

  // Skip First Innings Modal state
  const [showSkipFirstInningsModal, setShowSkipFirstInningsModal] =
    useState(false);
  const [skipTarget, setSkipTarget] = useState("");
  const [skipStriker, setSkipStriker] = useState("");
  const [skipNonStriker, setSkipNonStriker] = useState("");
  const [skipBowler, setSkipBowler] = useState("");
  const [skipBowlerDropdown, setSkipBowlerDropdown] = useState("");
  const [skipValidationError, setSkipValidationError] = useState("");

  // New Match and Abandoned confirmation modals
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [retireBatterName, setRetireBatterName] = useState("");
  const [retireNewBatterName, setRetireNewBatterName] = useState("");
  const [retireReason, setRetireReason] = useState("");

  // Track previous over state to detect completion
  const prevOverRef = useRef({
    ballNumber: currentOver.ballNumber,
    balls: currentOver.balls.length,
    totalBalls: score.balls,
  });

  // State from components
  // NOTE: Extras are PRE-SELECTION ONLY - they do NOT score immediately
  // They only affect the next run button tap, then reset after scoring
  const [extrasState, setExtrasState] = useState({
    wide: false,
    noBall: false,
    byes: false,
    legByes: false,
  });
  const [wicketState, setWicketState] = useState<{
    wicket: boolean;
    wicketType: WicketType | "";
    newBatterName: string;
    runOutBatsman: string;
  }>({ wicket: false, wicketType: "", newBatterName: "", runOutBatsman: "" });
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isScoringValid, setIsScoringValid] = useState(true);

  // Wicket confirmation modal state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [pendingRunValue, setPendingRunValue] = useState<number | null>(null);

  // Check if match exists on mount and redirect if needed
  useEffect(() => {
    const hasMatch = !!(
      teams.teamA &&
      teams.teamB &&
      battingTeam &&
      battingTeam.length > 0
    );

    if (!hasMatch) {
      navigate({ to: "/" });
    }
  }, [teams.teamA, teams.teamB, battingTeam, navigate]);

  // Detect over completion and open Select Bowler modal
  useEffect(() => {
    const prevOver = prevOverRef.current;
    const currentBalls = currentOver.balls.length;
    const currentBallNumber = currentOver.ballNumber;
    const currentTotalBalls = score.balls;

    // Detect over completion:
    // An over is complete when:
    // 1. We had balls in the previous state (over was in progress)
    // 2. Now ballNumber is 0 and balls array is empty (over reset)
    // 3. Total balls is a multiple of 6 (6 legal balls completed)
    const wasOverInProgress = prevOver.balls > 0 || prevOver.ballNumber > 0;
    const isOverNowReset = currentBallNumber === 0 && currentBalls === 0;
    const isLegalBallMultiple =
      currentTotalBalls > 0 && currentTotalBalls % 6 === 0;
    const justCompletedOver =
      wasOverInProgress && isOverNowReset && isLegalBallMultiple;

    const oversCompleted = Math.floor(score.balls / 6) >= oversLimit;
    const allWicketsFallen = score.wickets >= 10;
    const inningsEnded =
      (innings === 1 || innings === 2) && (oversCompleted || allWicketsFallen);

    // Only open modal if we just completed an over, modal not open, and innings not ended
    if (justCompletedOver && !showSelectBowlerModal && !inningsEnded) {
      setShowSelectBowlerModal(true);
    }

    // Update previous over state
    prevOverRef.current = {
      ballNumber: currentBallNumber,
      balls: currentBalls,
      totalBalls: currentTotalBalls,
    };
  }, [
    currentOver.ballNumber,
    currentOver.balls.length,
    score.balls,
    score.wickets,
    oversLimit,
    innings,
    showSelectBowlerModal,
  ]);

  // Check if first innings has ended
  const oversCompleted = Math.floor(score.balls / 6) >= oversLimit;
  const allWicketsFallen = score.wickets >= 10;
  const firstInningsEnded =
    innings === 1 && (oversCompleted || allWicketsFallen);

  // Check if match is complete (second innings only)
  const targetChased = innings === 2 && score.runs >= targetScore;
  const secondInningsOversCompleted = innings === 2 && oversCompleted;
  const secondInningsAllWicketsFallen = innings === 2 && allWicketsFallen;
  const matchComplete =
    innings === 2 &&
    (targetChased ||
      secondInningsOversCompleted ||
      secondInningsAllWicketsFallen);

  const scoringLockedByStatus =
    matchComplete || matchStatus === "COMPLETE" || matchStatus === "ABANDONED";
  const scoringLockedByUI =
    showSelectBowlerModal ||
    showSkipFirstInningsModal ||
    showNewMatchModal ||
    showAbandonModal ||
    showRetireModal;
  const firstInningsLocked = firstInningsEnded && innings === 1;
  const showScoringControls = matchStatus !== "ABANDONED";

  // Update matchStatus to COMPLETE when match ends
  useEffect(() => {
    if (matchComplete && matchStatus !== "COMPLETE") {
      setMatchStatus("COMPLETE");
    }
  }, [matchComplete, matchStatus, setMatchStatus]);

  // Calculate match result
  const getMatchResult = () => {
    if (!matchComplete) return null;

    const battingTeamName = battingTeam;
    const bowlingTeamName =
      battingTeam === teams.teamA ? teams.teamB : teams.teamA;

    if (targetChased) {
      // Batting team won
      const wicketsRemaining = 10 - score.wickets;
      return `${battingTeamName} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? "s" : ""}`;
    } else {
      // Bowling team won (target not chased)
      const runsDifference = targetScore - score.runs;
      return `${bowlingTeamName} won by ${runsDifference} run${runsDifference !== 1 ? "s" : ""}`;
    }
  };

  const matchResult = getMatchResult();


  // Handle New Match button click (from bottom card)
  const handleNewMatchClick = () => {
    setShowNewMatchModal(true);
    setShowHeaderMenu(false);
  };

  // Handle New Match confirmation
  const handleNewMatchConfirm = () => {
    // Reset entire Zustand store to initial state (atomic action)
    resetMatch();
    // Close modal
    setShowNewMatchModal(false);
    // Navigate to setup page
    navigate({ to: "/" });
  };

  // Handle New Match cancel
  const handleNewMatchCancel = () => {
    setShowNewMatchModal(false);
  };

  // Handle Abandon Match button click
  const handleAbandonClick = () => {
    setShowAbandonModal(true);
    setShowHeaderMenu(false);
  };

  // Handle Abandon Match confirmation
  const handleAbandonConfirm = () => {
    abandonMatch();
    resetMatch();
    setShowAbandonModal(false);
    navigate({ to: "/" });
  };

  // Handle Abandon Match cancel
  const handleAbandonCancel = () => {
    setShowAbandonModal(false);
  };

  const handleRetireCancel = () => {
    setShowRetireModal(false);
    setRetireBatterName("");
    setRetireNewBatterName("");
    setRetireReason("");
  };

  const handleRetireConfirm = () => {
    const trimmedNewBatterName = retireNewBatterName.trim();
    if (!retireBatterName || !trimmedNewBatterName) return;
    if (
      trimmedNewBatterName.toLowerCase() ===
        currentPlayers.striker.toLowerCase() ||
      trimmedNewBatterName.toLowerCase() ===
        currentPlayers.nonStriker.toLowerCase()
    ) {
      return;
    }

    retireBatter(retireBatterName, trimmedNewBatterName, retireReason);
    handleRetireCancel();
  };

  // Handle Select Bowler confirmation
  const handleBowlerConfirm = (bowlerName: string) => {
    setBowlerAction(bowlerName);
    setShowSelectBowlerModal(false);
  };

  // Handle Skip First Innings confirmation
  const handleSkipFirstInningsConfirm = () => {
    const target = parseInt(skipTarget, 10);

    // Validate target
    if (isNaN(target) || target <= 0) {
      setSkipValidationError("Target must be greater than 0");
      return;
    }

    // Validate: Only allow if in first innings
    if (innings !== 1) {
      setSkipValidationError("Cannot skip if not in first innings");
      return;
    }

    // Validate player names
    const trimmedStriker = skipStriker.trim();
    const trimmedNonStriker = skipNonStriker.trim();
    const trimmedBowler = skipBowler.trim();

    if (!trimmedStriker) {
      setSkipValidationError("Striker name is required");
      return;
    }

    if (!trimmedNonStriker) {
      setSkipValidationError("Non-Striker name is required");
      return;
    }

    if (!trimmedBowler) {
      setSkipValidationError("Bowler name is required");
      return;
    }

    // Validate: Prevent duplicate batter names
    if (trimmedStriker.toLowerCase() === trimmedNonStriker.toLowerCase()) {
      setSkipValidationError("Striker and Non-Striker must be different");
      return;
    }

    // Call store action with all parameters
    skipFirstInningsWithSetup(
      target,
      trimmedStriker,
      trimmedNonStriker,
      trimmedBowler,
    );

    // Close modal and reset state
    setShowSkipFirstInningsModal(false);
    setSkipTarget("");
    setSkipStriker("");
    setSkipNonStriker("");
    setSkipBowler("");
    setSkipBowlerDropdown("");
    setSkipValidationError("");
  };

  // Handle Skip First Innings cancel
  const handleSkipFirstInningsCancel = () => {
    setShowSkipFirstInningsModal(false);
    setSkipTarget("");
    setSkipStriker("");
    setSkipNonStriker("");
    setSkipBowler("");
    setSkipBowlerDropdown("");
    setSkipValidationError("");
  };

  // Handle bowler dropdown change in skip modal
  const handleSkipBowlerDropdownChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setSkipBowlerDropdown(value);
    setSkipBowler(value);
    setSkipValidationError("");
  };

  // Handle bowler input change in skip modal
  const handleSkipBowlerInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setSkipBowler(value);
    // Clear dropdown selection when user types
    if (value !== skipBowlerDropdown) {
      setSkipBowlerDropdown("");
    }
    setSkipValidationError("");
  };

  const handleStartSecondInnings = () => {
    if (striker.trim() && nonStriker.trim() && bowler.trim()) {
      startSecondInnings(striker.trim(), nonStriker.trim(), bowler.trim());
      setShowSecondInningsModal(false);
      setStriker("");
      setNonStriker("");
      setBowler("");
    }
  };

  // Get match title
  const matchTitle = `${teams.teamA || "Team A"} v/s ${teams.teamB || "Team B"}`;

  // Reset all UI state after successful ball submission
  const resetUIState = () => {
    // Clear all extras checkboxes
    setExtrasState({ wide: false, noBall: false, byes: false, legByes: false });

    // Clear wicket checkbox and related state
    setWicketState({
      wicket: false,
      wicketType: "",
      newBatterName: "",
      runOutBatsman: "",
    });

    // Trigger reset in child components (RunButtons, ScoringControls)
    setResetTrigger((prev) => prev + 1);

    // Close wicket modal if open
    setShowWicketModal(false);
    setPendingRunValue(null);
  };

  // Process ball submission
  const processBall = (runValue: number | null) => {
    const { wide, noBall, byes, legByes } = extrasState;
    const { wicket, wicketType } = wicketState;

    // Silent validation - don't submit if invalid combinations
    // Wide + (Byes or Leg Byes) ❌
    if (wide && (byes || legByes)) {
      return;
    }
    // Wicket + Wide ❌
    if (wicket && wide) {
      return;
    }
    // Byes/Leg Byes must have run value
    if ((byes || legByes) && runValue === null) {
      return;
    }

    // Priority order:
    // 1. If wicket is selected → call addWicket (with runs if any)
    if (wicket && wicketType) {
      const newBatterName = wicketState.newBatterName.trim();
      // Require batter name - never use placeholder
      if (!newBatterName) {
        return; // Cannot proceed without batter name
      }
      const runsWithWicket = runValue || 0;
      addWicket(
        wicketType,
        newBatterName,
        wicketState.runOutBatsman,
        runsWithWicket,
      );
    }
    // 2. Else if any extra is selected → call addExtra
    else if (wide || noBall || byes || legByes) {
      // Map UI selections to scoring logic payloads
      let extraType: "wide" | "noBall" | "byes" | "legByes" = "wide"; // Default, will be overridden
      let additionalRuns = 0;

      // Priority: Wide (cannot coexist with Byes/Leg Byes per validation)
      if (wide) {
        // Wide → { type: 'WD', runs: 1 + additionalRuns }
        extraType = "wide";
        additionalRuns = runValue || 0;
      }
      // No Ball combinations
      else if (noBall) {
        extraType = "noBall";
        if (byes) {
          // No Ball + Byes → { type: 'NB', runs: 1 + byes }
          additionalRuns = runValue || 0;
        } else if (legByes) {
          // No Ball + Leg Byes → { type: 'NB', runs: 1 + legByes }
          additionalRuns = runValue || 0;
        } else {
          // No Ball + runs → { type: 'NB', runs: 1 + runValue }
          // No Ball always adds 1, plus any runs scored
          additionalRuns = runValue || 0;
        }
      }
      // Byes only (without No Ball)
      else if (byes) {
        // Byes → { type: 'B', runs }
        extraType = "byes";
        // For byes, runValue is the total runs (store will use it directly)
        additionalRuns = runValue || 0;
      }
      // Leg Byes only (without No Ball)
      else if (legByes) {
        // Leg Byes → { type: 'LB', runs }
        extraType = "legByes";
        // For leg byes, runValue is the total runs (store will use it directly)
        additionalRuns = runValue || 0;
      }

      addExtra(extraType, additionalRuns);
    }
    // 3. Else → call addRun
    else if (runValue !== null) {
      addRun(runValue);
    }

    // Reset all UI state after successful submission
    resetUIState();
  };

  // Handle run selection - check for wicket scenario
  const handleRunChange = (runs: number | null) => {
    // Validate run value is provided and is one of the valid run values (0,1,2,3,4,6)
    if (runs === null) return;
    const validRunValues = [0, 1, 2, 3, 4, 6];
    if (!validRunValues.includes(runs)) return;

    const { wicket } = wicketState;

    // Open wicket modal ONLY IF: Wicket checkbox is checked AND run value clicked (0,1,2,3,4,6)
    if (wicket) {
      setPendingRunValue(runs);
      setShowWicketModal(true);
      return;
    }

    // Other scenarios: Run only or Extras + run → Auto-submit
    processBall(runs);
  };

  // Handle wicket confirmation from modal
  const handleConfirmWicket = () => {
    const { wicketType } = wicketState;

    // Validate wicket type is selected
    if (!wicketType) {
      return; // Don't submit if wicket type not selected
    }

    // Validate new batter name
    const newBatterName = wicketState.newBatterName.trim();
    if (!newBatterName) {
      return; // Don't submit if batter name not provided
    }

    // For run-out types, pass the selected batsman who is out
    const runOutBatsman =
      wicketType === "runOutStriker" || wicketType === "runOutNonStriker"
        ? wicketState.runOutBatsman
        : undefined;

    // Get runs scored with wicket (if any)
    // Wicket + runs = single ball event (e.g., caught off a boundary)
    const runsWithWicket = pendingRunValue || 0;

    // Call addWicket with runs (single ball event)
    // Note: Extras (wide/noBall) cannot occur with wicket, so we only handle runs
    addWicket(wicketType, newBatterName, runOutBatsman, runsWithWicket);

    // Reset all UI state after successful submission
    resetUIState();
  };

  // Handle cancel wicket modal
  const handleCancelWicket = () => {
    setShowWicketModal(false);
    setPendingRunValue(null);
  };

  const handleUndo = () => {
    undoLastBall();
    if (matchStatus === "COMPLETE") {
      setMatchStatus("IN_PROGRESS");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Green Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => {
            setShowAbandonModal(true);
            setShowHeaderMenu(false);
          }}
          className="text-white"
          aria-label="Abandon match"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1 text-left">{matchTitle}</h1>
        <div className="flex items-center gap-3 relative">
          <Link
            to="/summary"
            className="text-xs font-semibold px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors"
          >
            Summary
          </Link>
          <button
            onClick={() => setShowHeaderMenu((prev) => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="More options"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>

          {showHeaderMenu && (
            <div className="absolute right-0 top-10 w-48 bg-white text-gray-900 rounded-lg shadow-lg border border-gray-100 py-1 z-50">
              {innings === 1 &&
                matchStatus === "IN_PROGRESS" &&
                !firstInningsEnded && (
                  <button
                    onClick={() => {
                      setShowSkipFirstInningsModal(true);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Skip First Innings
                  </button>
                )}
              <button
                onClick={handleNewMatchClick}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                New Match
              </button>
              <button
                onClick={handleAbandonClick}
                disabled={matchStatus === "ABANDONED"}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abandoned
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 pb-24">
        <div className="w-full max-w-md mx-auto space-y-4">
          {/* Match Abandoned Banner */}
          {matchStatus === "ABANDONED" && (
            <div className="score-card bg-red-50 border-2 border-red-500">
              <div className="text-center">
                <h2 className="text-xl font-bold text-red-800">
                  Match Abandoned
                </h2>
                <p className="text-sm text-red-600 mt-1">
                  Scoring has been disabled
                </p>
              </div>
            </div>
          )}

          {/* Show Start Second Innings button if first innings ended */}
          {firstInningsEnded && (
            <div className="text-center">
              <button
                onClick={() => setShowSecondInningsModal(true)}
                className="score-button bg-green-500 text-white hover:bg-green-600 touch-target w-full shadow-md"
              >
                Start Second Innings
              </button>
            </div>
          )}

          {/* Match Result */}
          {matchComplete && matchResult && (
            <div className="score-card bg-green-50 border-2 border-green-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-green-800">
                  Match Complete!
                </h2>
                <p className="text-xl font-semibold text-green-700">
                  {matchResult}
                </p>
              </div>
            </div>
          )}

          {/* Layout order: ScoreBoard, Current Players Stats, Current Over */}
          <div className="space-y-4">
            {/* 1. ScoreBoard */}
            <ScoreBoard />

            {/* 2. Current Players Stats (Batsmen + Bowler) */}
            <div className="score-card">
              <CurrentPlayersStats
                onBowlerClick={() => setShowSelectBowlerModal(true)}
              />
            </div>

            {/* 3. Current Over */}
            <div className="score-card">
              <div className="flex flex-row items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  This over:
                </h2>
                <CurrentOver showLastCompletedOver={firstInningsEnded} />
              </div>
            </div>
          </div>

          {/* Scoring Controls - hide if first innings ended or match complete */}
          {/* Also disable all scoring controls when matchStatus === 'COMPLETE' or 'ABANDONED' or Select Bowler modal is open or Skip First Innings modal is open */}
          {showScoringControls && (
              <div className="space-y-4">
                {/* Scoring Controls + Run Buttons + Actions - Combined Card */}
                <div className="score-card w-full">
                  <ScoringControls
                    onWideChange={() => {}} // Component handles coordination internally
                    onNoBallChange={() => {}} // Component handles coordination internally
                    onExtrasStateChange={setExtrasState}
                    onWicketChange={() => {}} // Component handles coordination internally
                    onWicketStateChange={setWicketState}
                    onValidationChange={(isValid) => setIsScoringValid(isValid)}
                    resetTrigger={resetTrigger}
                    disabled={
                      scoringLockedByUI ||
                      firstInningsLocked ||
                      scoringLockedByStatus
                    }
                  />

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <RunButtons
                      onRunChange={handleRunChange}
                      resetTrigger={resetTrigger}
                      disabled={
                        !isScoringValid ||
                        scoringLockedByUI ||
                        firstInningsLocked ||
                        scoringLockedByStatus
                      }
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex flex-row gap-2 justify-between">
                      <button
                        onClick={handleUndo}
                        disabled={history.length === 0 || scoringLockedByUI}
                        className="score-button bg-green-500 text-white hover:bg-green-600 shadow-sm active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-sm min-h-0"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Undo2 className="w-4 h-4" aria-hidden="true" />
                          Undo
                        </span>
                      </button>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                        onClick={swapBatters}
                          disabled={
                            scoringLockedByUI ||
                            firstInningsLocked ||
                            scoringLockedByStatus
                          }
                          className="score-button bg-gray-500 text-white hover:bg-gray-600 shadow-sm active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-sm min-h-0"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowDownUp
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                            Swap
                          </span>
                        </button>
                        <button
                        onClick={() => setShowRetireModal(true)}
                          disabled={
                            scoringLockedByUI ||
                            firstInningsLocked ||
                            scoringLockedByStatus
                          }
                          className="score-button bg-red-500 text-white hover:bg-red-600 shadow-sm active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-sm min-h-0"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <UserX className="w-4 h-4" aria-hidden="true" />
                            Retire
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Actions moved to header menu */}
        </div>
      </div>

      {/* Modal for Second Innings Setup */}
      {showSecondInningsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Start Second Innings
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Striker
                </label>
                <input
                  type="text"
                  value={striker}
                  onChange={(e) => setStriker(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter striker name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Non-Striker
                </label>
                <input
                  type="text"
                  value={nonStriker}
                  onChange={(e) => setNonStriker(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter non-striker name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bowler
                </label>
                <input
                  type="text"
                  value={bowler}
                  onChange={(e) => setBowler(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bowler name"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSecondInningsModal(false);
                  setStriker("");
                  setNonStriker("");
                  setBowler("");
                }}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSecondInnings}
                disabled={
                  !striker.trim() || !nonStriker.trim() || !bowler.trim()
                }
                className="flex-1 score-button bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Wicket Confirmation */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Confirm Wicket</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Run value:{" "}
                  <span className="font-semibold">{pendingRunValue}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wicket Type
                </label>
                <select
                  value={wicketState.wicketType}
                  onChange={(e) => {
                    const type = e.target.value as WicketType | "";
                    setWicketState((prev) => ({
                      ...prev,
                      wicketType: type,
                      runOutBatsman: "",
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 bg-white"
                >
                  <option value="">Select wicket type...</option>
                  <option value="bowled">Bowled</option>
                  <option value="caught">Caught</option>
                  <option value="lbw">LBW</option>
                  <option value="stumping">Stumping</option>
                  <option value="hitWicket">Hit Wicket</option>
                  <option value="runOutStriker">Run Out Striker</option>
                  <option value="runOutNonStriker">Run Out Non-Striker</option>
                </select>
              </div>

              {/* Run Out Batsman Selection - Only visible for Run Out types */}
              {(wicketState.wicketType === "runOutStriker" ||
                wicketState.wicketType === "runOutNonStriker") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Which Batsman is Out?
                  </label>
                  <select
                    value={wicketState.runOutBatsman}
                    onChange={(e) => {
                      setWicketState((prev) => ({
                        ...prev,
                        runOutBatsman: e.target.value,
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-700 bg-white"
                  >
                    <option value="">Select batsman...</option>
                    {wicketState.wicketType === "runOutStriker" && (
                      <>
                        <option value={currentPlayers.striker}>
                          {currentPlayers.striker} (Striker)
                        </option>
                        <option value={currentPlayers.nonStriker}>
                          {currentPlayers.nonStriker} (Non-Striker)
                        </option>
                      </>
                    )}
                    {wicketState.wicketType === "runOutNonStriker" && (
                      <>
                        <option value={currentPlayers.nonStriker}>
                          {currentPlayers.nonStriker} (Non-Striker)
                        </option>
                        <option value={currentPlayers.striker}>
                          {currentPlayers.striker} (Striker)
                        </option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Batter Name
                </label>
                <input
                  type="text"
                  value={wicketState.newBatterName}
                  onChange={(e) => {
                    setWicketState((prev) => ({
                      ...prev,
                      newBatterName: e.target.value,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter new batter name"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelWicket}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWicket}
                disabled={
                  !wicketState.wicketType ||
                  !wicketState.newBatterName.trim() ||
                  ((wicketState.wicketType === "runOutStriker" ||
                    wicketState.wicketType === "runOutNonStriker") &&
                    !wicketState.runOutBatsman)
                }
                className="flex-1 score-button bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Select Bowler - Auto-opens at end of over */}
      <SelectBowlerModal
        isOpen={showSelectBowlerModal}
        onClose={() => setShowSelectBowlerModal(false)}
        onConfirm={handleBowlerConfirm}
      />

      {/* Modal for Skip First Innings */}
      {showSkipFirstInningsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // Close modal when clicking overlay
            if (e.target === e.currentTarget) {
              handleSkipFirstInningsCancel();
            }
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900">
              Skip First Innings & Start Second Innings
            </h2>

            <div className="space-y-3">
              {/* Target Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Runs
                </label>
                <input
                  type="number"
                  value={skipTarget}
                  onChange={(e) => {
                    setSkipTarget(e.target.value);
                    setSkipValidationError("");
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter target"
                  min="1"
                  required
                />
              </div>

              {/* Second Innings Batters */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Second Innings Batters
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={skipStriker}
                    onChange={(e) => {
                      setSkipStriker(e.target.value);
                      setSkipValidationError("");
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Striker Name"
                    required
                  />
                  <input
                    type="text"
                    value={skipNonStriker}
                    onChange={(e) => {
                      setSkipNonStriker(e.target.value);
                      setSkipValidationError("");
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Non-Striker Name"
                    required
                  />
                </div>
              </div>

              {/* Second Innings Bowler */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Second Innings Bowler
                </label>
                {/* Dropdown for existing bowlers */}
                <select
                  value={skipBowlerDropdown}
                  onChange={handleSkipBowlerDropdownChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="">-- Select existing bowler --</option>
                  {Object.keys(bowlers)
                    .sort()
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                {/* Text input for bowler */}
                <input
                  type="text"
                  value={skipBowler}
                  onChange={handleSkipBowlerInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Or enter new bowler name"
                  required
                />
              </div>

              {/* Validation Error */}
              {skipValidationError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {skipValidationError}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSkipFirstInningsCancel}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400 touch-target text-sm py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipFirstInningsConfirm}
                disabled={
                  !skipTarget ||
                  parseInt(skipTarget, 10) <= 0 ||
                  innings !== 1 ||
                  !skipStriker.trim() ||
                  !skipNonStriker.trim() ||
                  !skipBowler.trim() ||
                  skipStriker.trim().toLowerCase() ===
                    skipNonStriker.trim().toLowerCase()
                }
                className="flex-1 score-button bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-sm py-2"
              >
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Match Confirmation Modal */}
      {showNewMatchModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleNewMatchCancel();
            }
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900">
              Start New Match?
            </h2>
            <p className="text-sm text-gray-600">
              This will clear current match data. Are you sure you want to start
              a new match?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleNewMatchCancel}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400 touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleNewMatchConfirm}
                className="flex-1 score-button bg-blue-500 text-white hover:bg-blue-600 touch-target"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abandon Match Confirmation Modal */}
      {showAbandonModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleAbandonCancel();
            }
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900">
              Abandon This Match?
            </h2>
            <p className="text-sm text-gray-600">
              This will mark the match as abandoned and disable all scoring.
              Scorecard data will be preserved for viewing.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAbandonCancel}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400 touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleAbandonConfirm}
                className="flex-1 score-button bg-red-500 text-white hover:bg-red-600 touch-target"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retire Batter Modal */}
      {showRetireModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleRetireCancel();
            }
          }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900">Retire Batter</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select batter
                </label>
                <select
                  value={retireBatterName}
                  onChange={(e) => setRetireBatterName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                >
                  <option value="">Select batter...</option>
                  {currentPlayers.striker && (
                    <option value={currentPlayers.striker}>
                      {currentPlayers.striker} (Striker)
                    </option>
                  )}
                  {currentPlayers.nonStriker && (
                    <option value={currentPlayers.nonStriker}>
                      {currentPlayers.nonStriker} (Non-Striker)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New batter name
                </label>
                <input
                  type="text"
                  value={retireNewBatterName}
                  onChange={(e) => setRetireNewBatterName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter new batter name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter reason"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRetireCancel}
                className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400 touch-target"
              >
                Cancel
              </button>
              <button
                onClick={handleRetireConfirm}
                disabled={
                  !retireBatterName ||
                  !retireNewBatterName.trim() ||
                  retireNewBatterName.trim().toLowerCase() ===
                    currentPlayers.striker.toLowerCase() ||
                  retireNewBatterName.trim().toLowerCase() ===
                    currentPlayers.nonStriker.toLowerCase()
                }
                className="flex-1 score-button bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
