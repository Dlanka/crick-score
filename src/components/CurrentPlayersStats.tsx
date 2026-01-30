import { useMatchStore } from '../store/matchStore'

interface CurrentPlayersStatsProps {
  onBowlerClick?: () => void
}

export function CurrentPlayersStats({ onBowlerClick }: CurrentPlayersStatsProps) {
  const batters = useMatchStore((state) => state.batters)
  const bowlers = useMatchStore((state) => state.bowlers)
  const currentPlayers = useMatchStore((state) => state.currentPlayers)
  const history = useMatchStore((state) => state.history)

  // Get current playing batsmen
  const strikerStats = batters[currentPlayers.striker]
  const nonStrikerStats = batters[currentPlayers.nonStriker]
  const bowlerStats = bowlers[currentPlayers.bowler]

  // Calculate strike rate: (runs / balls) * 100
  const calculateStrikeRate = (runs: number, balls: number): number => {
    if (balls === 0) return 0
    return Math.round((runs / balls) * 100 * 100) / 100
  }

  // Calculate overs: balls / 6, format as overs.balls
  const formatOvers = (balls: number): string => {
    const overs = Math.floor(balls / 6)
    const remainingBalls = balls % 6
    return `${overs}.${remainingBalls}`
  }

  // Calculate economy rate: runs / overs
  const calculateEconomy = (runs: number, balls: number): number => {
    const overs = balls / 6
    if (overs === 0) return 0
    return Math.round((runs / overs) * 100) / 100
  }

  const extras = history.reduce(
    (acc, event) => {
      if (event.type !== 'extra') return acc
      const value = event.value ?? 0
      switch (event.kind) {
        case 'byes':
          acc.byes += value
          break
        case 'legByes':
          acc.legByes += value
          break
        case 'wide':
          acc.wides += value
          break
        case 'noBall':
          acc.noBalls += value
          break
        default:
          break
      }
      return acc
    },
    { byes: 0, legByes: 0, wides: 0, noBalls: 0 }
  )

  const extrasTotal =
    extras.byes + extras.legByes + extras.wides + extras.noBalls

  return (
    <div className="w-full space-y-2">
      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Batsmen Section */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batsman
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
            {/* Striker */}
            {strikerStats && (
              <tr className="bg-blue-50">
                <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900">
                  {currentPlayers.striker}*
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {strikerStats.runs}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {strikerStats.balls}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {strikerStats.fours}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {strikerStats.sixes}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {calculateStrikeRate(strikerStats.runs, strikerStats.balls).toFixed(2)}
                </td>
              </tr>
            )}
            {/* Non-Striker */}
            {nonStrikerStats && (
              <tr>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                  {currentPlayers.nonStriker}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {nonStrikerStats.runs}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {nonStrikerStats.balls}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {nonStrikerStats.fours}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {nonStrikerStats.sixes}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {calculateStrikeRate(nonStrikerStats.runs, nonStrikerStats.balls).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>

          {/* Bowler Section */}
          <thead className="bg-gray-50 border-t-2 border-gray-300">
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
            {bowlerStats && (
              <tr className="bg-blue-50">
                <td 
                  className={`px-3 py-2 whitespace-nowrap text-xs font-semibold text-gray-900 ${
                    onBowlerClick ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''
                  }`}
                  onClick={onBowlerClick}
                >
                  {currentPlayers.bowler}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {formatOvers(bowlerStats.balls)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {bowlerStats.maidens}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {bowlerStats.runs}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {bowlerStats.wickets}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                  {calculateEconomy(bowlerStats.runs, bowlerStats.balls).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border border-gray-200 rounded-md px-3 py-2 flex items-center justify-between bg-white">
        <span className="text-xs font-semibold text-gray-700">Extra</span>
        <span className="text-xs text-gray-700 tabular-nums">
          <span className="font-semibold text-gray-900">{extrasTotal}</span>
          <span className="text-gray-700"> ({extras.wides} WD, {extras.byes} B, {extras.legByes} LB, {extras.noBalls} NB)</span>
        </span>
      </div>
    </div>
  )
}
