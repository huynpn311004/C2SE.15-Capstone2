import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../services/AuthContext'
import { fetchSupermarketDashboardData } from '../../services/supermarketAdminApi'
import './SupermarketAdminDashboard.css'

export default function SupermarketAdminDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState({
    stats: { stores: 0, staff: 0, pending: 0, nearExpiry: 0 },
    storePerformance: [],
    recentDonations: [],
  })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const data = await fetchSupermarketDashboardData(user?.id)
        if (!active) return
        setDashboard(data)
        setError('')
      } catch {
        if (!active) return
        setDashboard({
          stats: { stores: 0, staff: 0, pending: 0, nearExpiry: 0 },
          storePerformance: [],
          recentDonations: [],
        })
        setError('Không thể tải dữ liệu dashboard từ backend.')
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [user])

  const stats = useMemo(
    () => [
      { label: 'Tổng Store', value: dashboard.stats.stores },
      { label: 'Store Staff', value: dashboard.stats.staff },
      { label: 'Yêu Cầu Đang Chờ', value: dashboard.stats.pending },
      { label: 'Sản Phẩm Sắp Hết Hạn', value: dashboard.stats.nearExpiry },
    ],
    [dashboard],
  )

  const storePerformance = dashboard.storePerformance
  const recentDonations = dashboard.recentDonations

  const statusBadge = { active: 'badge-success', warning: 'badge-warning' }

  return (
    <div className="sadashboard-page">
      {/* STATS GRID */}
      <div className="sadashboard-stats">
        {stats.map((stat, idx) => (
          <div key={idx} className="sadashboard-stat-card">
            <div className="sadashboard-stat-value">{stat.value}</div>
            <div className="sadashboard-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="sadashboard-content-grid">
        {/* Store Performance */}
        <div className="sadashboard-card">
          <h3 className="sadashboard-card-title">Hiệu Suất Theo Store</h3>
          <div className="sadashboard-store-list">
            {storePerformance.map((store) => (
              <div key={store.name} className="sadashboard-store-item">
                <div className="sadashboard-store-info">
                  <span className="sadashboard-store-name">{store.name}</span>
                  <span className="sadashboard-store-orders">{store.orders} đơn</span>
                </div>
                <div className="sadashboard-store-revenue">{store.revenue}</div>
                <span className={`badge ${statusBadge[store.status]}`}>
                  {store.status === 'active' ? 'Tốt' : 'Cảnh Báo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Donations */}
        <div className="sadashboard-card">
          <h3 className="sadashboard-card-title">Hoạt Động Donation Gần Đây</h3>
          <div className="sadashboard-donation-list">
            {recentDonations.map((donation) => (
              <div key={donation.id} className="sadashboard-donation-item">
                <div className="sadashboard-donation-info">
                  <span className="sadashboard-donation-store">{donation.store}</span>
                  <span className="sadashboard-donation-items">{donation.items}</span>
                  <span className="sadashboard-donation-recipient">→ {donation.recipient}</span>
                </div>
                <span className="sadashboard-donation-date">{donation.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
