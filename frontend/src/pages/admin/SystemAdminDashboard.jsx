import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { fetchAdminDashboardSummary } from '../../services/adminApi'
import './SystemAdminDashboard.css'

/**
 * Dashboard chính cho System Admin
 * Hiển thị: thống kê tổng quan
 */
export default function SystemAdminDashboard() {
  const [summary, setSummary] = useState({
    supermarkets: 0,
    charities: 0,
    users: 0,
    pendingRequests: 0,
  })

  useEffect(() => {
    let active = true

    async function loadSummary() {
      try {
        const data = await fetchAdminDashboardSummary()
        if (active) {
          setSummary(data)
        }
      } catch {
        if (active) {
          setSummary({
            supermarkets: 0,
            charities: 0,
            users: 0,
            pendingRequests: 0,
          })
        }
      }
    }

    loadSummary()
    return () => {
      active = false
    }
  }, [])

  const stats = [
    {
      label: 'Supermarket',
      value: summary.supermarkets,
      color: 'teal',
    },
    {
      label: 'Charity',
      value: summary.charities,
      color: 'red',
    },
    {
      label: 'Người dùng',
      value: summary.users,
      color: 'blue',
    },
    {
      label: 'Yêu cầu đang chờ',
      value: summary.pendingRequests,
      color: 'warning',
    },
  ]

  return (
    <SystemAdminLayout>
      <div className="dashboard-page">
        {/* STATS GRID */}
        <div className="dashboard-stats">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`stat-card stat-card-${stat.color}`}
            >
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>
    </SystemAdminLayout>
  )
}
