import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import './SystemAdminDashboard.css'

/**
 * Dashboard chính cho System Admin
 * Hiển thị: thống kê tổng quan
 */
export default function SystemAdminDashboard() {
  const stats = [
    {
      label: 'Supermarket',
      value: 12,
      change: '+2',
      color: 'teal',
    },
    {
      label: 'Charity',
      value: 8,
      change: '+1',
      color: 'red',
    },
    {
      label: 'Người dùng',
      value: 1240,
      change: '+45',
      color: 'blue',
    },
    {
      label: 'Yêu cầu đang chờ',
      value: 4,
      change: '⚠️',
      color: 'warning',
    },
  ]

  return (
    <SystemAdminLayout>
      <div className="dashboard-page">
        {/* WELCOME BANNER */}
        <div className="dashboard-welcome">
          <div className="welcome-content">
            <h2>Chào mừng, Quản trị viên Hệ thống</h2>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="dashboard-stats">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`stat-card stat-card-${stat.color}`}
            >
              <div className="stat-header">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-change">{stat.change}</span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>
    </SystemAdminLayout>
  )
}
