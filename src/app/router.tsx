import { createRouter, createRootRoute, createRoute, Outlet, redirect } from '@tanstack/react-router'
import { SetupPage } from '../pages/setup'
import { ScoringPage } from '../pages/scoring'
import { SummaryPage } from '../pages/summary'

// Helper to check if match exists
const hasActiveMatch = (): boolean => {
  try {
    const stored = localStorage.getItem('cricket_match_v1')
    if (!stored) return false
    
    const parsed = JSON.parse(stored)
    const state = parsed.state
    
    // Check if match is initialized (has teams and batting team)
    return !!(
      state?.teams?.teamA &&
      state?.teams?.teamB &&
      state?.battingTeam &&
      state?.oversLimit > 0
    )
  } catch {
    return false
  }
}

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  ),
})

// Index route (Match Setup)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // If match exists, redirect to scoring
    if (hasActiveMatch()) {
      throw redirect({ to: '/scoring' })
    }
  },
  component: SetupPage,
})

// Scoring route
const scoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scoring',
  beforeLoad: () => {
    // If no match exists, redirect to setup
    if (!hasActiveMatch()) {
      throw redirect({ to: '/' })
    }
  },
  component: ScoringPage,
})

// Summary route
const summaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/summary',
  beforeLoad: () => {
    if (!hasActiveMatch()) {
      throw redirect({ to: '/' })
    }
  },
  component: SummaryPage,
})

// Create route tree
const routeTree = rootRoute.addChildren([indexRoute, scoringRoute, summaryRoute])

// Create router
export const router = createRouter({ routeTree })

// Type declaration for router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
