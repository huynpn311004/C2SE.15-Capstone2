import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../../components/staff/Sidebar'
import TopHeader from '../../components/staff/TopHeader'

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (location.pathname === '/staff') {
    return <Navigate to="/staff/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
