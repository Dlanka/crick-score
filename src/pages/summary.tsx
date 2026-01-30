import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMatchStore } from "../store/matchStore";
import { BallEvent, InningsRecord } from "../types/match";

const formatOvers = (balls: number): string => {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
};

const calculateStrikeRate = (runs: number, balls: number): string => {
  if (balls === 0) return "0.00";
  return ((runs / balls) * 100).toFixed(2);
};

const calculateRunRate = (runs: number, balls: number): string => {
  const overs = balls / 6;
  if (overs === 0) return "0.00";
  return (runs / overs).toFixed(2);
};

const mapDismissal = (event: BallEvent): string => {
  if (event.type !== "wicket") return "not out";
  const bowler = event.snapshot.bowlerId;
  switch (event.kind) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return `c b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "stumping":
      return `st b ${bowler}`;
    case "hitWicket":
      return `hit wicket b ${bowler}`;
    case "runOutStriker":
    case "runOutNonStriker":
      return "run out";
    default:
      return event.kind ? `${event.kind} b ${bowler}` : `b ${bowler}`;
  }
};

const getInningsExtras = (history: BallEvent[]) => {
  return history.reduce(
    (acc, event) => {
      if (event.type !== "extra") return acc;
      const value = event.value ?? 0;
      switch (event.kind) {
        case "byes":
          acc.byes += value;
          break;
        case "legByes":
          acc.legByes += value;
          break;
        case "wide":
          acc.wides += value;
          break;
        case "noBall":
          acc.noBalls += value;
          break;
        default:
          break;
      }
      return acc;
    },
    { byes: 0, legByes: 0, wides: 0, noBalls: 0 }
  );
};

const getFallOfWickets = (history: BallEvent[]) => {
  return history
    .filter((event) => event.type === "wicket")
    .map((event) => {
      const runs = event.value ?? 0;
      const wicketNumber = event.snapshot.scoreWicketsBefore + 1;
      const scoreAtWicket = event.snapshot.scoreRunsBefore + runs;
      const ballNumber = event.snapshot.scoreBallsBefore + 1;
      return {
        batter: event.snapshot.fallenBatsmanId ?? "Unknown",
        score: `${scoreAtWicket}/${wicketNumber}`,
        over: formatOvers(ballNumber),
      };
    });
};

const buildCurrentInningsRecord = (state: {
  battingTeam: string;
  bowlingTeam: string;
  innings: number;
  score: InningsRecord["score"];
  batters: InningsRecord["batters"];
  bowlers: InningsRecord["bowlers"];
  history: InningsRecord["history"];
}): InningsRecord => {
  return {
    battingTeam: state.battingTeam,
    bowlingTeam: state.bowlingTeam,
    innings: state.innings,
    score: { ...state.score },
    batters: { ...state.batters },
    bowlers: { ...state.bowlers },
    history: [...state.history],
  };
};

export function SummaryPage() {
  const teams = useMatchStore((state) => state.teams);
  const inningsRecords = useMatchStore((state) => state.inningsRecords);
  const battingTeam = useMatchStore((state) => state.battingTeam);
  const bowlingTeam = useMatchStore((state) => state.bowlingTeam);
  const innings = useMatchStore((state) => state.innings);
  const score = useMatchStore((state) => state.score);
  const batters = useMatchStore((state) => state.batters);
  const bowlers = useMatchStore((state) => state.bowlers);
  const history = useMatchStore((state) => state.history);

  const currentRecord = useMemo(
    () =>
      buildCurrentInningsRecord({
        battingTeam,
        bowlingTeam,
        innings,
        score,
        batters,
        bowlers,
        history,
      }),
    [battingTeam, bowlingTeam, innings, score, batters, bowlers, history]
  );

  const allRecords = useMemo(() => {
    const exists = inningsRecords.some(
      (record) =>
        record.innings === currentRecord.innings &&
        record.battingTeam === currentRecord.battingTeam
    );
    return exists ? inningsRecords : [...inningsRecords, currentRecord];
  }, [inningsRecords, currentRecord]);

  const [activeTeam, setActiveTeam] = useState(teams.teamA || "Team A");

  const activeRecord = allRecords.find(
    (record) => record.battingTeam === activeTeam
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/scoring" className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold flex-1 text-center">Summary</h1>
        <div className="w-6 h-6" />
      </div>

      <div className="p-4">
        <div className="w-full max-w-3xl mx-auto space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTeam(teams.teamA || "Team A")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border ${
                activeTeam === (teams.teamA || "Team A")
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {teams.teamA || "Team 1"}
            </button>
            <button
              onClick={() => setActiveTeam(teams.teamB || "Team B")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border ${
                activeTeam === (teams.teamB || "Team B")
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {teams.teamB || "Team 2"}
            </button>
          </div>

          {!activeRecord ? (
            <div className="score-card text-sm text-gray-600">
              No data available for this team yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="score-card overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        B
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        4s
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        6s
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(activeRecord.batters).map(([name, stats]) => {
                      const wicketEvent = activeRecord.history
                        .filter((event) => event.type === "wicket")
                        .find(
                          (event) => event.snapshot.fallenBatsmanId === name
                        );
                      const retireEvent = activeRecord.history
                        .filter((event) => event.type === "retire")
                        .find(
                          (event) => event.snapshot.fallenBatsmanId === name
                        );

                      let status = "not out";
                      if (retireEvent) {
                        status = retireEvent.kind
                          ? `retired (${retireEvent.kind})`
                          : "retired";
                      } else if (wicketEvent) {
                        status = mapDismissal(wicketEvent);
                      }

                      return (
                        <tr key={name}>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                            <div className="flex flex-col">
                              <span>{name}</span>
                              <span className="text-[10px] text-gray-500 font-normal">
                                {status}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.runs}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.balls}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.fours}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.sixes}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {calculateStrikeRate(stats.runs, stats.balls)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    {(() => {
                      const extras = getInningsExtras(activeRecord.history);
                      const extrasTotal =
                        extras.byes +
                        extras.legByes +
                        extras.wides +
                        extras.noBalls;
                      return (
                        <>
                          <tr>
                            <td className="px-3 py-2 text-xs font-semibold text-gray-700">
                              Extra
                            </td>
                            <td
                              className="px-3 py-2 text-xs text-right tabular-nums text-gray-700"
                              colSpan={6}
                            >
                              <span className="font-semibold text-gray-900">
                                {extrasTotal}
                              </span>{" "}
                              ({extras.wides} WD, {extras.byes} B,{" "}
                              {extras.legByes} LB, {extras.noBalls} NB)
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-xs font-semibold text-gray-700">
                              Total
                            </td>
                            <td
                              className="px-3 py-2 text-xs text-right tabular-nums text-gray-700"
                              colSpan={6}
                            >
                              <span className="inline-flex items-center gap-4">
                                <span className="font-semibold text-gray-900">
                                  {activeRecord.score.runs} -{" "}
                                  {activeRecord.score.wickets} (
                                  {formatOvers(activeRecord.score.balls)})
                                </span>
                                <span>
                                  RR{" "}
                                  {calculateRunRate(
                                    activeRecord.score.runs,
                                    activeRecord.score.balls
                                  )}
                                </span>
                              </span>
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>

              <div className="score-card overflow-x-auto">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  Bowlers
                </h2>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        M
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        R
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        W
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ER
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(activeRecord.bowlers).map(
                      ([name, stats]) => (
                        <tr key={name}>
                          <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                            {name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {formatOvers(stats.balls)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.maidens}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.runs}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {stats.wickets}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                            {calculateRunRate(stats.runs, stats.balls)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="score-card overflow-x-auto">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  Fall of Wickets
                </h2>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batter name
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Over
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFallOfWickets(activeRecord.history).map((row, index) => (
                      <tr key={`${row.batter}-${index}`}>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                          {row.batter}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                          {row.score}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                          {row.over}
                        </td>
                      </tr>
                    ))}
                    {getFallOfWickets(activeRecord.history).length === 0 && (
                      <tr>
                        <td
                          className="px-3 py-2 text-xs text-gray-500"
                          colSpan={3}
                        >
                          No wickets yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
