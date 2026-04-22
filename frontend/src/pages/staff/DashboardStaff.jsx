import { useState, useEffect, useMemo } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchStaffDashboardSummary, fetchStaffOrders, fetchDashboardAlerts } from '../../services/staffApi'
import './DashboardStaff.css'

function getStatusBadge(status) {
  const s = (status || '').toLowerCase()
  if (s === 'pending' || s === 'đang chờ') return { text: 'Đang Chờ', cls: 'badge-pending' }
  if (s === 'completed' || s === 'đã hoàn thành') return { text: 'Hoàn Thành', cls: 'badge-completed' }
  if (s === 'processing' || s === 'đang xử lý') return { text: 'Đang Xử Lý', cls: 'badge-processing' }
  if (s === 'cancelled' || s === 'đã hủy') return { text: 'Đã Hủy', cls: 'badge-cancelled' }
  if (s === 'delivered' || s === 'đã giao') return { text: 'Đã Giao', cls: 'badge-completed' }
  return { text: status, cls: 'badge-default' }
}

function getExpiryBadge(daysLeft) {
  if (daysLeft < 0) return { text: `Hết hạn ${Math.abs(daysLeft)} ngày`, cls: 'badge-danger' }
  if (daysLeft <= 3) return { text: `${daysLeft} ngày`, cls: 'badge-danger' }
  if (daysLeft <= 7) return { text: `${daysLeft} ngày`, cls: 'badge-warning' }
  return { text: `${daysLeft} ngày`, cls: 'badge-success' }
}

function getLowStockBadge(qty) {
  if (qty <= 2) return { text: `Còn ${qty}`, cls: 'badge-danger' }
  if (qty <= 5) return { text: `Còn ${qty}`, cls: 'badge-warning' }
  return { text: `Còn ${qty}`, cls: 'badge-success' }
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLots: 0,
    totalInventoryQty: 0,
    nearExpiryProducts: 0,
    lowStockProducts: 0,
    ordersToday: 0,
    ordersPending: 0,
    ordersCompleted: 0,
    pendingRequests: 0,
  })
  const [orders, setOrders] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderFilter, setOrderFilter] = useState('all')

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [summary, ordersData, allLots] = await Promise.all([
        fetchStaffDashboardSummary(),
        fetchStaffOrders(),
        fetchDashboardAlerts(),
      ])
      setStats(summary)
      setOrders(ordersData)

      const alertItems = allLots
        .filter(lot => {
          const daysLeft = Math.ceil((new Date(lot.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          return daysLeft <= 7 || lot.quantity <= 5
        })
        .slice(0, 20)

      setAlerts(alertItems)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders.slice(0, 10)
    if (orderFilter === 'pending') return orders.filter(o => (o.status || '').toLowerCase() === 'pending').slice(0, 10)
    if (orderFilter === 'completed') return orders.filter(o => (o.status || '').toLowerCase() === 'completed').slice(0, 10)
    return orders.slice(0, 10)
  }, [orders, orderFilter])

  const statCards = [
    { label: 'Tổng Lô Hàng', value: stats.totalLots, sub: `${stats.totalInventoryQty} sản phẩm`, tone: 'success' },
    { label: 'Sắp Hết Hạn', value: stats.nearExpiryProducts, sub: '≤ 7 ngày', tone: stats.nearExpiryProducts > 0 ? 'warning' : 'success' },
    { label: 'Tồn Kho Thấp', value: stats.lowStockProducts, sub: '≤ 5 sản phẩm', tone: stats.lowStockProducts > 0 ? 'warning' : 'success' },
    { label: 'Đơn Hàng Hôm Nay', value: stats.ordersToday, sub: `${stats.ordersPending} chờ · ${stats.ordersCompleted} xong`, tone: 'success' },
    { label: 'Yêu Cầu Đang Chờ', value: stats.pendingRequests, sub: 'quyên góp', tone: stats.pendingRequests > 0 ? 'warning' : 'success' },
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
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-sub">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-content-grid">
          {/* Alerts Section */}
          <div className="dashboard-section dashboard-section-alerts">
            <div className="section-header-row">
              <h3 className="dashboard-section-title">Cảnh Báo</h3>
              <span className="section-badge-count">{alerts.length}</span>
            </div>
            <div className="alerts-list">
              {alerts.length > 0 ? (
                alerts.map((alert) => {
                  const daysLeft = Math.ceil((new Date(alert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                  const isExpiry = daysLeft <= 7
                  const badge = isExpiry ? getExpiryBadge(daysLeft) : getLowStockBadge(alert.quantity)
                  return (
                    <div key={alert.id} className="alert-item">
                      <div className="alert-item-info">
                        <p className="alert-name">{alert.productName}</p>
                        <p className="alert-meta">
                          {alert.lotCode} · HSD: {new Date(alert.expiryDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="alert-item-right">
                        <span className={`badge ${badge.cls}`}>{badge.text}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-cell">Không có cảnh báo nào</div>
              )}
            </div>
          </div>

          {/* Orders Section */}
          <div className="dashboard-section dashboard-section-orders">
            <div className="section-header-row">
              <h3 className="dashboard-section-title">Đơn Hàng Gần Đây</h3>
              <div className="order-filter-tabs">
                {['all', 'pending', 'completed'].map(f => (
                  <button
                    key={f}
                    className={`order-filter-tab ${orderFilter === f ? 'active' : ''}`}
                    onClick={() => setOrderFilter(f)}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Đang chờ' : 'Hoàn thành'}
                  </button>
                ))}
              </div>
            </div>
            <div className="orders-list">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status)
                  return (
                    <div key={order.id} className="order-item">
                      <div className="order-item-info">
                        <p className="order-id">{order.id}</p>
                        <p className="order-meta">{order.customer} · {order.createdAt}</p>
                      </div>
                      <div className="order-item-right">
                        <span className={`badge ${badge.cls}`}>{badge.text}</span>
                        <span className="order-amount">{order.amount}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-cell">Không có đơn hàng</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
