import { Navigate } from 'react-router-dom'

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * TODO: Implement actual authentication check in Sprint 1
 */
interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // For now, this is a placeholder
  // In Sprint 1, we'll check for actual authentication tokens
  const isAuthenticated = localStorage.getItem('accessToken') !== null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
