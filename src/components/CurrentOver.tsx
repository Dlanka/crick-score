import { useMatchStore } from '../store/matchStore'

type BallDisplay = {
  display: string
  value: number
  isWicket: boolean
  isWide: boolean
  isNoBall: boolean
  isByes: boolean
  isLegByes: boolean
  extraLabel?: string // Short label for extras (Wd, Nb, B, Lb)
  extraValue?: number // Additional runs for extras
}

export function CurrentOver() {
  // Subscribe to both currentOver and history separately to ensure immediate updates
  // Using separate selectors prevents infinite re-render loops
  const currentOver = useMatchStore((state) => state.currentOver)
  const history = useMatchStore((state) => state.history)

  // Get all events from the current over
  // Count backwards from history to find where current over started
  // currentOver.balls.length tells us how many valid balls are in current over
  const currentOverEvents: BallDisplay[] = []
  let validBallsSeen = 0
  let startIndex = history.length

  // Find the starting index of the current over
  // Count backwards until we've seen currentOver.balls.length valid balls
  for (let i = history.length - 1; i >= 0; i--) {
    const event = history[i]
    
    // Determine if this event counts as a ball
    const countsAsBall = 
      event.type === 'run' || 
      event.type === 'wicket' ||
      (event.type === 'extra' && (event.kind === 'byes' || event.kind === 'legByes'))
    
    if (countsAsBall) {
      validBallsSeen++
      // If we've seen more valid balls than in current over, we've found the start
      if (validBallsSeen > currentOver.balls.length) {
        startIndex = i + 1
        break
      }
    }
    
    // If we've reached the beginning and haven't found enough, current over starts at index 0
    if (i === 0) {
      startIndex = 0
    }
  }

  // Now collect all events from startIndex to the end (these are all in current over)
  for (let i = startIndex; i < history.length; i++) {
    const event = history[i]
    
    // Format display based on event type
    let display: BallDisplay | null = null

    if (event.type === 'wicket') {
      display = {
        display: 'W',
        value: 0,
        isWicket: true,
        isWide: false,
        isNoBall: false,
        isByes: false,
        isLegByes: false,
      }
    } else if (event.type === 'extra') {
      const value = event.value || 0
      
      if (event.kind === 'wide') {
        // Wide → show "0" in circle, "XWD" label outside (e.g., "2WD" for Wide + 2 runs)
        const additionalRuns = value > 1 ? value - 1 : 0
        display = {
          display: '0', // Always show 0 in circle for Wide
          value,
          isWicket: false,
          isWide: true,
          isNoBall: false,
          isByes: false,
          isLegByes: false,
          extraLabel: 'WD',
          extraValue: additionalRuns > 0 ? additionalRuns : undefined, // Will be shown as "2WD" in label
        }
      } else if (event.kind === 'noBall') {
        // No Ball → show run value in circle, "Nb" label outside
        const additionalRuns = value > 1 ? value - 1 : 0
        display = {
          display: additionalRuns > 0 ? additionalRuns.toString() : '', // Show additional runs in circle, empty if just 1
          value,
          isWicket: false,
          isWide: false,
          isNoBall: true,
          isByes: false,
          isLegByes: false,
          extraLabel: 'Nb',
          extraValue: additionalRuns > 0 ? additionalRuns : undefined,
        }
      } else if (event.kind === 'byes') {
        // Byes → show run value in circle, "B" label outside
        display = {
          display: value.toString(), // Show runs in circle
          value,
          isWicket: false,
          isWide: false,
          isNoBall: false,
          isByes: true,
          isLegByes: false,
          extraLabel: 'B',
        }
      } else if (event.kind === 'legByes') {
        // Leg Byes → show run value in circle, "Lb" label outside
        display = {
          display: value.toString(), // Show runs in circle
          value,
          isWicket: false,
          isWide: false,
          isNoBall: false,
          isByes: false,
          isLegByes: true,
          extraLabel: 'Lb',
        }
      }
    } else if (event.type === 'run') {
      // Regular runs
      display = {
        display: event.value?.toString() || '0',
        value: event.value || 0,
        isWicket: false,
        isWide: false,
        isNoBall: false,
        isByes: false,
        isLegByes: false,
      }
    }

    if (display) {
      currentOverEvents.push(display)
    }
  }

  // If no events, show empty state
  if (currentOverEvents.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">No balls bowled yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {currentOverEvents.map((ball, index) => {
          // Determine badge color based on ball type
          const isWicket = ball.isWicket
          const isWide = ball.isWide
          const isNoBall = ball.isNoBall
          const isByes = ball.isByes
          const isLegByes = ball.isLegByes
          const isBoundary = ball.value === 4 || ball.value === 6

          let badgeClass = 'bg-gray-100 text-gray-800'
          if (isWicket) {
            badgeClass = 'bg-red-500 text-white'
          } else if (isWide || isNoBall) {
            badgeClass = 'bg-yellow-500 text-white'
          } else if (isByes || isLegByes) {
            badgeClass = 'bg-yellow-400 text-white'
          } else if (isBoundary || ball.value === 5) {
            badgeClass = 'bg-orange-500 text-white'
          } else if (ball.value > 0) {
            badgeClass = 'bg-gray-100 text-gray-800'
          }

          // For extras, show only run value (or nothing) in circle
          const circleContent = isWicket ? 'W' : (isWide || isNoBall || isByes || isLegByes) ? ball.display : ball.display

          return (
            <div key={index} className="relative inline-flex items-center justify-center">
              {/* Circle badge - 28px */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${badgeClass}`}
              >
                {circleContent}
              </div>
              {/* Absolute positioned label for extras */}
              {ball.extraLabel && (
                <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                  {ball.extraValue !== undefined && ball.extraValue > 0 
                    ? `${ball.extraValue}${ball.extraLabel}` // e.g., "2WD" for Wide + 2 runs
                    : ball.extraLabel // e.g., "WD" for Wide only
                  }
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
