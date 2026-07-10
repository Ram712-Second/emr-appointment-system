/**
 * Dashboard Page
 * Main dashboard showing overview and statistics
 */
export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to the EMR Appointment System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">24</div>
          <div className="text-gray-600 mt-1">Today's Appointments</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">12</div>
          <div className="text-gray-600 mt-1">Completed</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-yellow-600">8</div>
          <div className="text-gray-600 mt-1">Pending</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-red-600">4</div>
          <div className="text-gray-600 mt-1">Cancelled</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
        <div className="text-gray-600 text-center py-8">
          Dashboard content will be implemented in future sprints
        </div>
      </div>
    </div>
  )
}
