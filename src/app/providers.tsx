import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

export function Providers() {
  return <RouterProvider router={router} />
}
