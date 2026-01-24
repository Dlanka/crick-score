import { useState, useEffect } from 'react'

export type WicketType = 'bowled' | 'caught' | 'lbw' | 'runOut'

interface WicketButtonsProps {
  wide: boolean
  noBall: boolean
  onWicketChange: (checked: boolean) => void
  onWicketStateChange: (state: { wicket: boolean; wicketType: WicketType | ''; newBatterName: string }) => void
  resetTrigger?: number
}

export function WicketButtons({ wide, noBall, onWicketChange, onWicketStateChange, resetTrigger }: WicketButtonsProps) {
  // Component state for wicket checkbox and dropdown (not Zustand)
  const [wicket, setWicket] = useState(false)
  const [wicketType, setWicketType] = useState<WicketType | ''>('')
  const [newBatterName, setNewBatterName] = useState('')

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setWicket(false)
      setWicketType('')
      setNewBatterName('')
      onWicketChange(false)
    }
  }, [resetTrigger, onWicketChange])

  // Handle Wicket checkbox
  const handleWicket = (checked: boolean) => {
    if (checked) {
      // Wicket cannot be selected together with Wide
      if (wide) {
        // Prevent selection if Wide is checked
        return
      }
      setWicket(true)
      onWicketChange(true)
    } else {
      setWicket(false)
      setWicketType('') // Clear dropdown when unchecked
      setNewBatterName('') // Clear batter name when unchecked
      onWicketChange(false)
    }
  }

  // Handle Wicket Type dropdown change
  const handleWicketTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as WicketType
    // Validate: Wicket CAN be selected with No Ball (Run Out only)
    if (type && type !== 'runOut' && noBall) {
      // If not Run Out and No Ball is checked, prevent selection
      // Reset to empty
      e.target.value = ''
      return
    }
    setWicketType(type || '')
  }

  // Sync with parent: if Wide becomes checked, uncheck Wicket
  useEffect(() => {
    if (wide && wicket) {
      setWicket(false)
      setWicketType('')
      setNewBatterName('')
      onWicketChange(false)
    }
  }, [wide, wicket, onWicketChange])

  // Sync with parent: if No Ball becomes checked and wicket type is not Run Out, clear it
  useEffect(() => {
    if (noBall && wicket && wicketType && wicketType !== 'runOut') {
      // Invalid: No Ball with non-Run Out wicket
      // Reset wicket type
      setWicketType('')
    }
  }, [noBall, wicket, wicketType])

  // Notify parent of wicket state changes
  useEffect(() => {
    onWicketStateChange({ wicket, wicketType, newBatterName })
  }, [wicket, wicketType, newBatterName, onWicketStateChange])

  const wicketTypeOptions: { value: WicketType; label: string }[] = [
    { value: 'bowled', label: 'Bowled' },
    { value: 'caught', label: 'Caught' },
    { value: 'lbw', label: 'LBW' },
    { value: 'runOut', label: 'Run Out' },
  ]

  // Determine if dropdown should be disabled based on No Ball rule
  const isWicketTypeDisabled = (type: WicketType) => {
    // If No Ball is checked, only Run Out is allowed
    if (noBall && type !== 'runOut') {
      return true
    }
    return false
  }

  return (
    <div className="space-y-4">
      {/* Wicket Checkbox */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-red-400 cursor-pointer transition-colors touch-target">
          <input
            type="checkbox"
            checked={wicket}
            onChange={(e) => handleWicket(e.target.checked)}
            disabled={wide} // Disable if Wide is checked
            className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-base font-medium text-gray-700 flex-1">Wicket</span>
        </label>

        {/* Dropdown - only visible if Wicket is checked */}
        {wicket && (
          <div className="mt-2">
            <select
              value={wicketType}
              onChange={handleWicketTypeChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base font-medium text-gray-700 bg-white touch-target"
            >
              <option value="">Select wicket type...</option>
              {wicketTypeOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={isWicketTypeDisabled(option.value)}
                >
                  {option.label}
                  {isWicketTypeDisabled(option.value) && ' (Not allowed with No Ball)'}
                </option>
              ))}
            </select>
            {wicketType && (
              <p className="mt-2 text-xs text-gray-600">
                Selected: {wicketTypeOptions.find((opt) => opt.value === wicketType)?.label}
              </p>
            )}
            
            {/* New Batter Name Input - only visible if Wicket is checked and type is selected */}
            {wicket && wicketType && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  New Batter Name
                </label>
                <input
                  type="text"
                  value={newBatterName}
                  onChange={(e) => setNewBatterName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  placeholder="Enter new batter name"
                />
              </div>
            )}
          </div>
        )}

        {/* Validation messages */}
        {wide && wicket && (
          <p className="text-xs text-red-600 mt-1">
            Wicket cannot be selected with Wide
          </p>
        )}
        {noBall && wicket && !wicketType && (
          <p className="text-xs text-amber-600 mt-1">
            Only Run Out is allowed with No Ball
          </p>
        )}
      </div>
    </div>
  )
}
