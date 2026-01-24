import { useState, useEffect, useRef } from 'react'
import { useMatchStore } from '../store/matchStore'

interface SelectBowlerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (bowlerName: string) => void
}

export function SelectBowlerModal({ isOpen, onClose, onConfirm }: SelectBowlerModalProps) {
  const bowlers = useMatchStore((state) => state.bowlers)
  const currentBowler = useMatchStore((state) => state.currentPlayers.bowler)
  
  const [selectedBowlerFromDropdown, setSelectedBowlerFromDropdown] = useState('')
  const [bowlerName, setBowlerName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Get list of existing bowler names
  const bowlerNames = Object.keys(bowlers).sort()

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBowlerName(currentBowler || '')
      setSelectedBowlerFromDropdown(currentBowler || '')
      setError('')
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, currentBowler])

  // Handle dropdown selection - auto-fill input
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedBowlerFromDropdown(value)
    setBowlerName(value)
    setError('')
  }

  // Handle input change - override dropdown
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBowlerName(value)
    // Clear dropdown selection when user types
    if (value !== selectedBowlerFromDropdown) {
      setSelectedBowlerFromDropdown('')
    }
    setError('')
  }

  // Filter bowler names for autocomplete suggestions
  const getSuggestions = () => {
    if (!bowlerName.trim()) return bowlerNames
    const lowerInput = bowlerName.toLowerCase()
    return bowlerNames.filter(name => 
      name.toLowerCase().includes(lowerInput)
    )
  }

  const suggestions = getSuggestions()

  // Handle confirm
  const handleConfirm = () => {
    const trimmedName = bowlerName.trim()
    
    if (!trimmedName) {
      setError('Bowler name cannot be empty')
      return
    }

    onConfirm(trimmedName)
    onClose()
  }

  // Handle cancel
  const handleCancel = () => {
    setBowlerName('')
    setSelectedBowlerFromDropdown('')
    setError('')
    onClose()
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Close modal when clicking overlay
        if (e.target === e.currentTarget) {
          handleCancel()
        }
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900">
          Select Bowler
        </h2>
        
        <div className="space-y-3">
          {/* Dropdown for existing bowlers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Existing Bowler
            </label>
            <select
              value={selectedBowlerFromDropdown}
              onChange={handleDropdownChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select a bowler --</option>
              {bowlerNames.map((name) => (
                <option 
                  key={name} 
                  value={name}
                  className={name === currentBowler ? 'font-semibold bg-blue-50' : ''}
                >
                  {name}{name === currentBowler ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Text input for new bowler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Enter New Bowler Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={bowlerName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter bowler name"
            />
            {/* Autocomplete suggestions */}
            {bowlerName.trim() && suggestions.length > 0 && suggestions.length < bowlerNames.length && (
              <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-md max-h-32 overflow-y-auto">
                {suggestions.slice(0, 5).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setBowlerName(name)
                      setSelectedBowlerFromDropdown(name)
                      setError('')
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                      name === currentBowler ? 'font-semibold bg-blue-50' : ''
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCancel}
            className="flex-1 score-button bg-gray-300 text-gray-700 hover:bg-gray-400 touch-target"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!bowlerName.trim()}
            className="flex-1 score-button bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
