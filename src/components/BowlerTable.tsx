import { useMatchStore } from '../store/matchStore'

export function BowlerTable() {
  const bowlers = useMatchStore((state) => state.bowlers)
  const currentBowler = useMatchStore((state) => state.currentPlayers.bowler)

  // Convert bowlers object to array and sort by wickets (descending), then by economy (ascending)
  const bowlerEntries = Object.entries(bowlers).sort((a, b) => {
    const wicketsDiff = b[1].wickets - a[1].wickets
    if (wicketsDiff !== 0) return wicketsDiff
    
    // If wickets are equal, sort by economy (lower is better)
    const oversA = a[1].balls / 6
    const oversB = b[1].balls / 6
    const economyA = oversA > 0 ? a[1].runs / oversA : 0
    const economyB = oversB > 0 ? b[1].runs / oversB : 0
    return economyA - economyB
  })

  // Calculate economy rate: runs / overs
  const calculateEconomy = (runs: number, balls: number): number => {
    const overs = balls / 6
    if (overs === 0) return 0
    return Math.round((runs / overs) * 100) / 100 // Round to 2 decimal places
  }

  // If no bowlers, show empty state
  if (bowlerEntries.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No bowler statistics available</p>
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bowler
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
                  ER
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bowlerEntries.map(([name, stats]) => {
                const isCurrentBowler = name === currentBowler
                const economy = calculateEconomy(stats.runs, stats.balls)

                return (
                  <tr
                    key={name}
                    className={
                      isCurrentBowler
                        ? 'bg-blue-50 font-semibold'
                        : 'hover:bg-gray-50'
                    }
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {name}
                      {isCurrentBowler && (
                        <span className="ml-2 text-xs text-blue-600">●</span>
                      )}
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
                      {economy.toFixed(2)}
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
