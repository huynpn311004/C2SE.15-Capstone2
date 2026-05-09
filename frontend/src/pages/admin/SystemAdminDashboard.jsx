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
    deliveries: 0,
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
            deliveries: 0,
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
      label: 'Siêu thị',
      value: summary.supermarkets || 0,
      color: 'teal',
    },
    {
      label: 'Tổ chức từ thiện',
      value: summary.charities || 0,
      color: 'red',
    },
    {
      label: 'Đối tác Giao hàng',
      value: summary.deliveries || 0,
      color: 'orange',
    },
    {
      label: 'Người dùng',
      value: summary.users || 0,
      color: 'blue',
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
