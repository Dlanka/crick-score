import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMatchStore } from '../store/matchStore'

export function SetupPage() {
  const navigate = useNavigate()
  const startMatch = useMatchStore((state) => state.startMatch)
  const battingTeam = useMatchStore((state) => state.battingTeam)
  const teams = useMatchStore((state) => state.teams)

  // Check if match exists on mount and redirect if needed
  useEffect(() => {
    const hasMatch = !!(
      teams.teamA &&
      teams.teamB &&
      battingTeam &&
      battingTeam.length > 0
    )
    
    if (hasMatch) {
      navigate({ to: '/scoring' })
    }
  }, [teams.teamA, teams.teamB, battingTeam, navigate])

  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [oversLimit, setOversLimit] = useState('')
  const [selectedBattingTeam, setSelectedBattingTeam] = useState<'teamA' | 'teamB'>('teamA')
  const [striker, setStriker] = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowler, setBowler] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!teamA || !teamB || !oversLimit || !striker || !nonStriker || !bowler) {
      return
    }

    const overs = parseInt(oversLimit, 10)
    if (isNaN(overs) || overs < 1) {
      return
    }

    startMatch({
      teamA,
      teamB,
      oversLimit: overs,
      striker,
      nonStriker,
      bowler,
    })

    navigate({ to: '/scoring' })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md score-card space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Match Setup
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team A Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team A Name
            </label>
            <input
              type="text"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter team A name"
              required
            />
          </div>

          {/* Team B Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team B Name
            </label>
            <input
              type="text"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter team B name"
              required
            />
          </div>

          {/* Overs Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overs
            </label>
            <input
              type="number"
              value={oversLimit}
              onChange={(e) => setOversLimit(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter number of overs"
              min="1"
              required
            />
          </div>

          {/* Bat / Bowl Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batting Team
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="battingTeam"
                  value="teamA"
                  checked={selectedBattingTeam === 'teamA'}
                  onChange={(e) => setSelectedBattingTeam(e.target.value as 'teamA' | 'teamB')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Team A</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="battingTeam"
                  value="teamB"
                  checked={selectedBattingTeam === 'teamB'}
                  onChange={(e) => setSelectedBattingTeam(e.target.value as 'teamA' | 'teamB')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Team B</span>
              </label>
            </div>
          </div>

          {/* Starting Players */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700">Starting Players</p>

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

          {/* Start Match Button */}
          <button
            type="submit"
            className="w-full score-button bg-blue-500 text-white hover:bg-blue-600 touch-target"
          >
            Start Match
          </button>
        </form>
      </div>
    </div>
  )
}
