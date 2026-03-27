import './SupermarketAdminDashboard.css'

export default function SupermarketAdminDashboard() {
  const stats = [
    { label: 'Tổng Store', value: 5, change: '+1', tone: 'success' },
    { label: 'Store Staff', value: 24, change: '+3', tone: 'success' },
    { label: 'Yêu Cầu Đang Chờ', value: 6, change: '⚠️', tone: 'warning' },
    { label: 'Sản Phẩm Sắp Hết Hạn', value: 18, change: '⚠️', tone: 'warning' },
  ]

  const storePerformance = [
    { name: 'BigMart Q1', orders: 142, revenue: '48.5M', status: 'active' },
    { name: 'BigMart Q3', orders: 118, revenue: '39.2M', status: 'active' },
    { name: 'BigMart Q5', orders: 95, revenue: '31.0M', status: 'warning' },
    { name: 'BigMart Q7', orders: 76, revenue: '24.8M', status: 'active' },
  ]

  const recentDonations = [
    { id: 1, store: 'BigMart Q1', items: 'Sữa Tươi x20', recipient: 'Quỹ Hy Vọng', date: '25/03/2026' },
    { id: 2, store: 'BigMart Q3', items: 'Bánh Mì x15', recipient: 'Green Hands', date: '24/03/2026' },
  ]

  const statusBadge = { active: 'badge-success', warning: 'badge-warning' }

  return (
    <div className="sadashboard-page">
      {/* WELCOME BANNER */}
      <div className="sadashboard-welcome">
        <div className="sadashboard-welcome-content">
          <h2>Chào Mừng, Quản Lý Siêu Thị!</h2>
          <p>Giám sát hoạt động chuỗi store và nhân viên</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="sadashboard-stats">
        {stats.map((stat, idx) => (
          <div key={idx} className={`sadashboard-stat-card ${stat.tone === 'warning' ? 'sadashboard-stat-warning' : ''}`}>
            <div className="sadashboard-stat-header">
              <span className={`sadashboard-stat-change sadashboard-stat-change-${stat.tone}`}>{stat.change}</span>
            </div>
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
