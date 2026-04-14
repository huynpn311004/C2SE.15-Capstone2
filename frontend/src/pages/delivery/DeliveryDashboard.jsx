import { useEffect, useState } from 'react'
import DeliveryLayout from '../../components/layout/DeliveryLayout'
import { useAuth } from '../../services/AuthContext'
import './DeliveryDashboard.css'

export default function DeliveryDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState({
    availableOrders: 3,
    activeOrders: 0,
    completedToday: 0,
    earningsToday: 0,
  })

  const stats = [
    {
      label: 'Đơn khả dụng',
      value: summary.availableOrders,
      color: 'teal',
    },
    {
      label: 'Đơn đang giao',
      value: summary.activeOrders,
      color: 'blue',
    },
    {
      label: 'Hoàn thành hôm nay',
      value: summary.completedToday,
      color: 'green',
    },
    {
      label: 'Thu nhập hôm nay',
      value: `${summary.earningsToday.toLocaleString('vi-VN')}đ`,
      color: 'orange',
    },
  ]

  return (
    <DeliveryLayout>
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
    </DeliveryLayout>
  )
}
