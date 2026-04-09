import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchStaffDashboardSummary, fetchCategoryStats } from '../../services/staffApi'
import './DashboardStaff.css'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLots: 0,
    nearExpiryProducts: 0,
    ordersToday: 0,
    pendingRequests: 0,
  })
  const [categoryData, setCategoryData] = useState([])
  const [orderTrend] = useState([18, 22, 15, 30, 25, 32, 28])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [summary, categories] = await Promise.all([
        fetchStaffDashboardSummary(),
        fetchCategoryStats(),
      ])
      setStats(summary)
      setCategoryData(categories)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Tổng Số Lô Hàng', value: stats.totalLots, change: '+12', tone: 'success' },
    { label: 'Sản Phẩm Sắp Hết Hạn', value: stats.nearExpiryProducts, change: stats.nearExpiryProducts > 0 ? '!' : 'OK', tone: stats.nearExpiryProducts > 0 ? 'warning' : 'success' },
    { label: 'Đơn Hàng Hôm Nay', value: stats.ordersToday, change: '+5', tone: 'success' },
    { label: 'Yêu Cầu Đang Chờ', value: stats.pendingRequests, change: stats.pendingRequests > 0 ? '!' : 'OK', tone: stats.pendingRequests > 0 ? 'warning' : 'success' },
  ]

  if (loading) {
    return (
      <StaffLayout>
        <div className="dashboard-page">
          <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải...</div>
        </div>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="dashboard-page">
        <div className="dashboard-stats">
          {statCards.map((stat, idx) => (
            <div key={idx} className={`stat-card ${stat.tone === 'warning' ? 'stat-card-warning' : ''}`}>
              <div className="stat-header">
                <span className={`stat-change stat-change-${stat.tone}`}>{stat.change}</span>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-content-grid">
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Sắp Hết Hạn Theo Danh Mục</h3>
            <div className="category-progress-list">
              {categoryData.length > 0 ? (
                categoryData.map((item) => (
                  <div key={item.name} className="category-progress-item">
                    <div className="category-progress-header">
                      <span className="category-name">{item.name}</span>
                      <span className="category-percent">{item.percent}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-cell">Không có dữ liệu</div>
              )}
            </div>
          </div>

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
