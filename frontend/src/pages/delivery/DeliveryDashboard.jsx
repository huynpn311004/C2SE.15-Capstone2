import { useEffect, useState } from 'react'
import DeliveryLayout from '../../components/layout/DeliveryLayout'
import {
  fetchDeliveryOrders,
  fetchActiveDeliveries,
  fetchDeliveryHistory,
  fetchDeliveryStats,
} from '../../services/deliveryApi'
import './DeliveryDashboard.css'

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0đ'
  return Number(amount).toLocaleString('vi-VN') + 'đ'
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getStatusBadge(status) {
  const s = (status || '').toLowerCase()
  if (s === 'assigned') return { text: 'Đã Nhận', cls: 'badge-blue' }
  if (s === 'picking_up') return { text: 'Đang Lấy', cls: 'badge-orange' }
  if (s === 'delivering') return { text: 'Đang Giao', cls: 'badge-teal' }
  if (s === 'completed') return { text: 'Hoàn Thành', cls: 'badge-green' }
  if (s === 'cancelled') return { text: 'Đã Hủy', cls: 'badge-red' }
  return { text: status, cls: 'badge-default' }
}

export default function DeliveryDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({
    total_orders: 0,
    completed_orders: 0,
    active_orders: 0,
    total_earnings: 0,
    average_earning: 0,
  })

  const [assignedOrders, setAssignedOrders] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [activeTab, setActiveTab] = useState('assigned')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')
      const [statsData, assignedData, historyData] = await Promise.all([
        fetchDeliveryStats().catch(() => ({ total_orders: 0, completed_orders: 0, active_orders: 0, total_earnings: 0, average_earning: 0 })),
        fetchDeliveryOrders().catch(() => []),
        fetchDeliveryHistory('today').catch(() => []),
      ])
      setStats(statsData)
      setAssignedOrders(assignedData.items || assignedData || [])
      setCompletedOrders(historyData.items || historyData || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Không thể tải dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }

  const completionRate = stats.total_orders > 0
    ? Math.round((stats.completed_orders / stats.total_orders) * 100)
    : 0

  const statCards = [
    { label: 'Đơn Đã Giao', value: stats.completed_orders, tone: 'success' },
    { label: 'Đơn Đang Giao', value: stats.active_orders, tone: 'info' },
    { label: 'Tổng Thu Nhập', value: formatCurrency(stats.total_earnings), tone: 'warning' },
    { label: 'TB/Đơn', value: formatCurrency(stats.average_earning), tone: 'teal' },
  ]

  return (
    <DeliveryLayout>
      <div className="dashboard-page">
        {/* STATS */}
        <div className="dashboard-stats">
          {statCards.map((stat, idx) => (
            <div key={idx} className={`stat-card stat-card-${stat.tone}`}>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="dash-tabs">
          <button
            className={`dash-tab ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            Đơn Đã Nhận ({assignedOrders.length})
          </button>
          <button
            className={`dash-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Hoàn Thành Hôm Nay ({completedOrders.length})
          </button>
          <button
            className={`dash-tab ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Hiệu Suất
          </button>
        </div>

        {/* ASSIGNED ORDERS */}
        {activeTab === 'assigned' && (
          <div className="dash-content">
            {loading ? (
              <div className="dash-loading">
                <div className="spinner"></div>
                <span>Đang tải...</span>
              </div>
            ) : error ? (
              <div className="dash-error">{error}</div>
            ) : assignedOrders.length === 0 ? (
              <div className="dash-empty">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <p>Không có đơn nào được giao</p>
              </div>
            ) : (
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3>Đơn Đã Được Phân Công</h3>
                  <span className="dash-count">{assignedOrders.length} đơn</span>
                </div>
                <div className="dash-list">
                  {assignedOrders.map((order) => {
                    const badge = getStatusBadge(order.status)
                    return (
                      <div key={order.id} className="dash-list-item">
                        <div className="dash-item-info">
                          <span className="dash-item-id">{order.delivery_code}</span>
                          <span className="dash-item-name">{order.store_name}</span>
                          <span className="dash-item-meta">
                            {order.customer_name} · {order.customer_address}
                          </span>
                        </div>
                        <div className="dash-item-right">
                          <span className={`badge ${badge.cls}`}>{badge.text}</span>
                          <span className="dash-item-reward">{formatCurrency(order.reward)}</span>
                          <span className="dash-item-date">
                            {formatDateTime(order.assigned_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMPLETED ORDERS */}
        {activeTab === 'completed' && (
          <div className="dash-content">
            {loading ? (
              <div className="dash-loading">
                <div className="spinner"></div>
                <span>Đang tải...</span>
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="dash-empty">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p>Chưa có đơn hoàn thành hôm nay</p>
              </div>
            ) : (
              <div className="dash-card">
                <div className="dash-card-header">
                  <h3>Đơn Hoàn Thành Hôm Nay</h3>
                  <span className="dash-count">{completedOrders.length} đơn</span>
                </div>
                <div className="dash-list">
                  {completedOrders.map((order) => {
                    const badge = getStatusBadge(order.status)
                    return (
                      <div key={order.id} className="dash-list-item">
                        <div className="dash-item-info">
                          <span className="dash-item-id">{order.delivery_code}</span>
                          <span className="dash-item-name">{order.store_name}</span>
                          <span className="dash-item-meta">
                            {order.customer_name} · {order.customer_address}
                          </span>
                        </div>
                        <div className="dash-item-right">
                          <span className={`badge ${badge.cls}`}>{badge.text}</span>
                          <span className="dash-item-reward">{formatCurrency(order.reward)}</span>
                          <span className="dash-item-date">
                            {formatDateTime(order.completed_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PERFORMANCE METRICS */}
        {activeTab === 'metrics' && (
          <div className="dash-content">
            <div className="metrics-grid">
              {/* Completion Rate */}
              <div className="dash-card metric-card">
                <h3>Tỷ Lệ Hoàn Thành</h3>
                <div className="metric-big-value">{completionRate}%</div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill progress-fill-success" style={{ width: `${completionRate}%` }} />
                </div>
                <p className="metric-desc">{stats.completed_orders} / {stats.total_orders} đơn</p>
              </div>

              {/* Active Orders */}
              <div className="dash-card metric-card">
                <h3>Đơn Đang Hoạt Động</h3>
                <div className="metric-big-value">{stats.active_orders}</div>
                <p className="metric-desc">đơn đang trong quá trình giao</p>
              </div>

              {/* Total Earnings */}
              <div className="dash-card metric-card">
                <h3>Tổng Thu Nhập</h3>
                <div className="metric-big-value metric-currency">{formatCurrency(stats.total_earnings)}</div>
                <p className="metric-desc">tất cả thời gian giao hàng</p>
              </div>

              {/* Average per Order */}
              <div className="dash-card metric-card">
                <h3>Thu Nhập Trung Bình</h3>
                <div className="metric-big-value metric-currency">{formatCurrency(stats.average_earning)}</div>
                <p className="metric-desc">mỗi đơn giao thành công</p>
              </div>

              {/* Summary */}
              <div className="dash-card metric-card metric-summary">
                <h3>Tổng Quan</h3>
                <div className="summary-rows">
                  <div className="summary-row">
                    <span>Tổng đơn đã nhận</span>
                    <strong>{stats.total_orders}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Đơn hoàn thành</span>
                    <strong className="text-success">{stats.completed_orders}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Đơn đang giao</span>
                    <strong className="text-info">{stats.active_orders}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Thu nhập trung bình/đơn</span>
                    <strong>{formatCurrency(stats.average_earning)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Tổng thu nhập</span>
                    <strong className="text-warning">{formatCurrency(stats.total_earnings)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DeliveryLayout>
  )
}
