import { useState, useEffect } from 'react'

interface ExtraButtonsProps {
  wicket: boolean
  onWideChange: (checked: boolean) => void
  onNoBallChange: (checked: boolean) => void
  onExtrasStateChange: (state: { wide: boolean; noBall: boolean; byes: boolean; legByes: boolean }) => void
  resetTrigger?: number
}

export function ExtraButtons({ wicket, onWideChange, onNoBallChange, onExtrasStateChange, resetTrigger }: ExtraButtonsProps) {
  // Component state for extras checkboxes (not Zustand)
  const [wide, setWide] = useState(false)
  const [noBall, setNoBall] = useState(false)
  const [byes, setByes] = useState(false)
  const [legByes, setLegByes] = useState(false)

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setWide(false)
      setNoBall(false)
      setByes(false)
      setLegByes(false)
      onWideChange(false)
      onNoBallChange(false)
    }
  }, [resetTrigger, onWideChange, onNoBallChange])

  // Handle Wide checkbox
  const handleWide = (checked: boolean) => {
    if (checked) {
      // Wide cannot be selected together with Wicket
      if (wicket) {
        // Prevent selection if Wicket is checked
        return
      }
      setWide(true)
      setNoBall(false) // Wide OR No Ball - mutually exclusive
      setByes(false) // Wide cannot coexist with Byes
      setLegByes(false) // Wide cannot coexist with Leg Byes
      onWideChange(true)
    } else {
      setWide(false)
      onWideChange(false)
    }
  }

  // Handle No Ball checkbox
  const handleNoBall = (checked: boolean) => {
    if (checked) {
      setNoBall(true)
      setWide(false) // Wide OR No Ball - mutually exclusive
      // No Ball CAN coexist with Byes OR Leg Byes (no change needed)
      // No Ball CAN coexist with Wicket (Run Out only - validated in WicketButtons)
      onNoBallChange(true)
    } else {
      setNoBall(false)
      onNoBallChange(false)
    }
  }

  // Handle Byes checkbox
  const handleByes = (checked: boolean) => {
    if (checked) {
      setByes(true)
      setLegByes(false) // Byes OR Leg Byes - mutually exclusive
      setWide(false) // Wide cannot coexist with Byes
      // No Ball CAN coexist with Byes (no change needed)
    } else {
      setByes(false)
    }
  }

  // Handle Leg Byes checkbox
  const handleLegByes = (checked: boolean) => {
    if (checked) {
      setLegByes(true)
      setByes(false) // Byes OR Leg Byes - mutually exclusive
      setWide(false) // Wide cannot coexist with Leg Byes
      // No Ball CAN coexist with Leg Byes (no change needed)
    } else {
      setLegByes(false)
    }
  }

  // Sync with parent: if Wicket becomes checked, uncheck Wide
  useEffect(() => {
    if (wicket && wide) {
      setWide(false)
      onWideChange(false)
    }
  }, [wicket, wide, onWideChange])

  // Notify parent of extras state changes
  useEffect(() => {
    onExtrasStateChange({ wide, noBall, byes, legByes })
  }, [wide, noBall, byes, legByes, onExtrasStateChange])

  // Calculate disabled states dynamically
  const isWideDisabled = wicket || byes || legByes
  const isNoBallDisabled = wide // Wide and No Ball are mutually exclusive
  const isByesDisabled = wide // Wide cannot coexist with Byes
  const isLegByesDisabled = wide // Wide cannot coexist with Leg Byes

  return (
    <div className="space-y-4">
      {/* Group 1: Pace Extras - Wide / No Ball */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Pace Extras
        </label>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors touch-target ${
            isWideDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
              : 'border-gray-200 hover:border-yellow-400 cursor-pointer'
          }`}>
            <input
              type="checkbox"
              checked={wide}
              onChange={(e) => handleWide(e.target.checked)}
              disabled={isWideDisabled}
              className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-base font-medium flex-1 ${
              isWideDisabled ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Wide (WD)
            </span>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors touch-target ${
            isNoBallDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
              : 'border-gray-200 hover:border-yellow-400 cursor-pointer'
          }`}>
            <input
              type="checkbox"
              checked={noBall}
              onChange={(e) => handleNoBall(e.target.checked)}
              disabled={isNoBallDisabled}
              className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-base font-medium flex-1 ${
              isNoBallDisabled ? 'text-gray-400' : 'text-gray-700'
            }`}>
              No Ball (NB)
            </span>
          </label>
        </div>
      </div>

      {/* Group 2: Fielding Extras - Byes / Leg Byes */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Fielding Extras
        </label>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors touch-target ${
            isByesDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
              : 'border-gray-200 hover:border-yellow-400 cursor-pointer'
          }`}>
            <input
              type="checkbox"
              checked={byes}
              onChange={(e) => handleByes(e.target.checked)}
              disabled={isByesDisabled}
              className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-base font-medium flex-1 ${
              isByesDisabled ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Byes (B)
            </span>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors touch-target ${
            isLegByesDisabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
              : 'border-gray-200 hover:border-yellow-400 cursor-pointer'
          }`}>
            <input
              type="checkbox"
              checked={legByes}
              onChange={(e) => handleLegByes(e.target.checked)}
              disabled={isLegByesDisabled}
              className="w-5 h-5 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={`text-base font-medium flex-1 ${
              isLegByesDisabled ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Leg Byes (LB)
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
