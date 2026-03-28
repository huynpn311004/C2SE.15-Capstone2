import StaffLayout from '../../components/layout/StaffLayout'
import './DashboardStaff.css'

export default function Dashboard() {
  const stats = [
    { label: 'Tổng Số Lô Hàng', value: 126, change: '+12', tone: 'success' },
    { label: 'Sản Phẩm Sắp Hết Hạn', value: 18, change: '⚠️', tone: 'warning' },
    { label: 'Đơn Hàng Hôm Nay', value: 42, change: '+5', tone: 'success' },
    { label: 'Yêu Cầu Đang Chờ', value: 4, change: '⚠️', tone: 'warning' },
  ]

  const categoryData = [
    { name: 'Sữa', percent: 72 },
    { name: 'Nước Giải Khát', percent: 46 },
    { name: 'Bánh Mì', percent: 58 },
    { name: 'Thực Phẩm Tươi', percent: 34 },
  ]

  const orderTrend = [18, 22, 15, 30, 25, 32, 28]

  return (
    <StaffLayout>
      <div className="dashboard-page">
      {/* WELCOME BANNER */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <h2>Chào Mừng, Nhân Viên Cửa Hàng!</h2>
          <p>Theo dõi hoạt động kho hàng và đơn hàng của bạn</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="dashboard-stats">
        {stats.map((stat, idx) => (
          <div key={idx} className={`stat-card ${stat.tone === 'warning' ? 'stat-card-warning' : ''}`}>
            <div className="stat-header">
              <span className={`stat-change stat-change-${stat.tone}`}>{stat.change}</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="dashboard-content-grid">
        {/* Category Progress */}
        <div className="dashboard-section">
          <h3 className="dashboard-section-title">Sắp Hết Hạn Theo Danh Mục</h3>
          <div className="category-progress-list">
            {categoryData.map((item) => (
              <div key={item.name} className="category-progress-item">
                <div className="category-progress-header">
                  <span className="category-name">{item.name}</span>
                  <span className="category-percent">{item.percent}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders Trend */}
        <div className="dashboard-section">
          <h3 className="dashboard-section-title">Xu Hướng Đơn Hàng</h3>
          <p className="dashboard-section-subtitle">7 ngày gần nhất</p>
          <div className="orders-trend-container">
            {orderTrend.map((value, index) => (
              <div key={index} className="trend-bar-wrapper">
                <div className="trend-bar" style={{ height: `${value * 3}px` }} />
                <span className="trend-label">T{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </StaffLayout>
  )
}
