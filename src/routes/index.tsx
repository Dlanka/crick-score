import { createFileRoute } from '@tanstack/react-router'
import { useStore } from '../store'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { count, increment, decrement } = useStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Welcome to CrickScore
        </h1>
        
        <div className="text-center space-y-4">
          <p className="text-lg text-gray-600">
            React + Vite + TypeScript
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={decrement}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 active:scale-95 transition-transform"
            >
              -
            </button>
            
            <span className="text-2xl font-semibold text-gray-800 min-w-[3rem] text-center">
              {count}
            </span>
            
            <button
              onClick={increment}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
          
          <p className="text-sm text-gray-500">
            Zustand state management demo
          </p>
        </div>
      </div>
    </div>
  )
}
