import { useMatchStore } from "../store/matchStore";

export function ScoreBoard() {
  const battingTeam = useMatchStore((state) => state.battingTeam);
  const innings = useMatchStore((state) => state.innings);
  const score = useMatchStore((state) => state.score);

  const overs = Math.floor(score.balls / 6);
  const balls = score.balls % 6;

  // Calculate Current Run Rate (CRR): (runs / overs) * 6
  const calculateCRR = (): number => {
    const totalOvers = overs + balls / 6;
    if (totalOvers === 0) return 0;
    return Math.round((score.runs / totalOvers) * 100) / 100;
  };

  const crr = calculateCRR();

  return (
    <div className="relative">
      {/* CRR - Absolute positioned at top */}
      <div className="absolute top-0 right-0 text-right">
        <span className="text-sm text-gray-500">CRR</span>
        <p className="text-lg font-semibold text-gray-800 tabular-nums">
          {crr.toFixed(2)}
        </p>
      </div>

      {/* Team Name and Innings */}
      <div>
        <p className="text-base font-semibold text-gray-800">
          {battingTeam || "Team"}, {innings === 1 ? "1st" : "2nd"} inning
        </p>
      </div>

      {/* Score and Overs - Inline */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900 tabular-nums">
          {score.runs} - {score.wickets}
        </span>
        <span className="text-xl font-semibold text-gray-600 tabular-nums">
          ({overs}.{balls})
        </span>
      </div>
    </div>
  );
}
