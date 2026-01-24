import { useMatchStore } from '../store/matchStore'

export function PlayerInputs() {
  const currentPlayers = useMatchStore((state) => state.currentPlayers)

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Striker
        </label>
        <input
          type="text"
          value={currentPlayers.striker}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Non-Striker
        </label>
        <input
          type="text"
          value={currentPlayers.nonStriker}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bowler
        </label>
        <input
          type="text"
          value={currentPlayers.bowler}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
        />
      </div>
    </div>
  )
}
