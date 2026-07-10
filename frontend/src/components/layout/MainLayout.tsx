import { Outlet, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/**
 * Main Layout Component
 * Provides the common layout structure with header and sidebar
 */
export function MainLayout() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">EMR System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Dr. User</span>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow p-4 space-y-2">
              <Link to="/dashboard">
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  Dashboard
                </Button>
              </Link>
              <Link to="/scheduler">
                <Button
                  variant={isActive('/scheduler') ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  Scheduler
                </Button>
              </Link>
              <Link to="/appointments/book">
                <Button
                  variant={isActive('/appointments/book') ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  Book Appointment
                </Button>
              </Link>
              <Link to="/appointments">
                <Button
                  variant={isActive('/appointments') ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  Appointments
                </Button>
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
