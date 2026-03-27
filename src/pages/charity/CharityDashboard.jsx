import CharityLayout from '../../components/layout/CharityLayout'
import './CharityDashboard.css'

export default function CharityDashboard() {
  const stats = [
    { label: 'Đơn Đã Nhận', value: 12, change: '+3', tone: 'success' },
    { label: 'Đơn Đang Chờ', value: 4, change: '⚠️', tone: 'warning' },
    {label: 'Tổng Sản Phẩm', value: 156, change: '+28', tone: 'success' },
    { label: 'Siêu Thị Đã Quyên Góp', value: 5, change: '+1', tone: 'success' },
  ]

  const recentRequests = [
    { id: 'YC-101', item: 'Sữa Tươi 1L', store: 'BigMart Q1', qty: 20, date: '25/03/2026', status: 'approved' },
    { id: 'YC-102', item: 'Bánh Mì', store: 'BigMart Q3', qty: 15, date: '24/03/2026', status: 'pending' },
    { id: 'YC-103', item: 'Nước Giải Khát', store: 'BigMart Q5', qty: 30, date: '23/03/2026', status: 'received' },
  ]

  const statusBadge = {
    pending: 'badge-warning',
    approved: 'badge-info',
    received: 'badge-success',
    rejected: 'badge-danger',
  }

  const statusLabel = {
    pending: 'Đang Chờ',
    approved: 'Đã Duyệt',
    received: 'Đã Nhận',
    rejected: 'Từ Chối',
  }

  return (
    <CharityLayout>
      <div className="chdash-page">
        {/* WELCOME */}
        <div className="chdash-welcome">
          <div className="chdash-welcome-content">
            <h2>Chào Mừng, Quỹ Hy Vọng!</h2>
            <p>Theo dõi các yêu cầu nhận donation và lịch sử hoạt động</p>
          </div>
        </div>

        {/* STATS */}
        <div className="chdash-stats">
          {stats.map((stat, idx) => (
            <div key={idx} className={`chdash-stat-card ${stat.tone === 'warning' ? 'chdash-stat-warning' : ''}`}>
              <div className="chdash-stat-header">
                <span className={`chdash-stat-change chdash-stat-change-${stat.tone}`}>{stat.change}</span>
              </div>
              <div className="chdash-stat-value">{stat.value}</div>
              <div className="chdash-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CONTENT GRID */}
        <div className="chdash-content-grid">
          {/* Recent Requests */}
          <div className="chdash-card">
            <h3 className="chdash-card-title">Yêu Cầu Gần Đây</h3>
            <div className="chdash-request-list">
              {recentRequests.map((req) => (
                <div key={req.id} className="chdash-request-item">
                  <div className="chdash-request-info">
                    <span className="chdash-request-id">{req.id}</span>
                    <span className="chdash-request-name">{req.item}</span>
                    <span className="chdash-request-store">{req.store} • {req.qty} sản phẩm</span>
                  </div>
                  <div className="chdash-request-meta">
                    <span className={`badge ${statusBadge[req.status]}`}>{statusLabel[req.status]}</span>
                    <span className="chdash-request-date">{req.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="chdash-card">
            <h3 className="chdash-card-title">Tóm Tắt Hoạt Động</h3>
            <div className="chdash-activity-list">
              <div className="chdash-activity-item">
                <span className="chdash-activity-dot chdash-dot-success" />
                <span className="chdash-activity-text">Yêu cầu được duyệt: <strong>8</strong></span>
              </div>
              <div className="chdash-activity-item">
                <span className="chdash-activity-dot chdash-dot-warning" />
                <span className="chdash-activity-text">Yêu cầu đang chờ: <strong>4</strong></span>
              </div>
              <div className="chdash-activity-item">
                <span className="chdash-activity-dot chdash-dot-success" />
                <span className="chdash-activity-text">Đơn đã nhận hàng: <strong>12</strong></span>
              </div>
              <div className="chdash-activity-item">
                <span className="chdash-activity-dot chdash-dot-info" />
                <span className="chdash-activity-text">Siêu thị đã quyên góp: <strong>5</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CharityLayout>
  )
}
