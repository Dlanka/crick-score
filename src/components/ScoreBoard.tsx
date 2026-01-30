import { useMatchStore } from "../store/matchStore";

export function ScoreBoard() {
  const battingTeam = useMatchStore((state) => state.battingTeam);
  const innings = useMatchStore((state) => state.innings);
  const score = useMatchStore((state) => state.score);
  const targetScore = useMatchStore((state) => state.targetScore);
  const oversLimit = useMatchStore((state) => state.oversLimit);

  const overs = Math.floor(score.balls / 6);
  const balls = score.balls % 6;

  // Calculate Current Run Rate (CRR): (runs / overs) * 6
  const calculateCRR = (): number => {
    const totalOvers = overs + balls / 6;
    if (totalOvers === 0) return 0;
    return Math.round((score.runs / totalOvers) * 100) / 100;
  };

  const crr = calculateCRR();

  // Required Run Rate (RRR) for second innings only
  const calculateRRR = (): number | null => {
    if (innings !== 2 || targetScore <= 0) return null;
    const remainingRuns = targetScore - score.runs;
    if (remainingRuns <= 0) return null;
    const oversBowled = score.balls / 6;
    const remainingOvers = oversLimit - oversBowled;
    if (remainingOvers <= 0) return null;
    return Math.round((remainingRuns / remainingOvers) * 100) / 100;
  };

  const rrr = calculateRRR();

  return (
    <div className="score-card relative">
      {/* Team Name and Innings */}
      <div className="flex justify-between items-center">
        <p className="text-base font-semibold text-gray-800">
          {battingTeam || "Team"}, {innings === 1 ? "1st" : "2nd"} inning
        </p>

        {innings === 2 && targetScore > 0 && (
          <div className="text-right flex gap-1 items-center">
            <span className="text-sm text-gray-700">Target</span>
            <span className="text-lg font-bold text-gray-700 tabular-nums">
              {targetScore}
            </span>
          </div>
        )}
      </div>

      {/* Score and Overs - Inline */}
      <div className="flex justify-between items-center ">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tabular-nums">
            {score.runs} - {score.wickets}
          </span>
          <span className="text-xl font-semibold text-gray-600 tabular-nums">
            ({overs}.{balls})
          </span>
        </div>

        <div className="flex gap-3 items-center">
          <div className="text-right flex gap-1 items-center">
            <span className="text-sm text-gray-500">CRR</span>
            <span className="text-sm font-semibold text-gray-800 tabular-nums">
              {crr.toFixed(2)}
            </span>
          </div>

          {rrr !== null && (
            <div className="text-right flex gap-1 items-center">
              <span className="text-sm text-gray-500">RRR</span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">
                {rrr.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
