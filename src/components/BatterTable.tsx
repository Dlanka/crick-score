import { useMatchStore } from '../store/matchStore'

export function BatterTable() {
  const batters = useMatchStore((state) => state.batters)
  const striker = useMatchStore((state) => state.currentPlayers.striker)

  // Convert batters object to array and sort by runs (descending)
  const batterEntries = Object.entries(batters).sort(
    (a, b) => b[1].runs - a[1].runs
  )

  // Calculate strike rate: (runs / balls) * 100
  const calculateStrikeRate = (runs: number, balls: number): number => {
    if (balls === 0) return 0
    return Math.round((runs / balls) * 100 * 100) / 100 // Round to 2 decimal places
  }

  // If no batters, show empty state
  if (batterEntries.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No batter statistics available</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-full inline-block align-middle">
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batter Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Runs
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  4s
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  6s
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balls
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SR
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batterEntries.map(([name, stats]) => {
                const isStriker = name === striker
                const strikeRate = calculateStrikeRate(stats.runs, stats.balls)

                return (
                  <tr
                    key={name}
                    className={
                      isStriker
                        ? 'bg-blue-50 font-semibold'
                        : 'hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {name}
                      {isStriker && (
                        <span className="ml-2 text-xs text-blue-600">●</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                      {stats.runs}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                      {stats.fours}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                      {stats.sixes}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                      {stats.balls}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 text-right tabular-nums">
                      {strikeRate.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
