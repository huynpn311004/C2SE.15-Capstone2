import { useEffect, useState } from 'react'
import DeliveryLayout from '../../components/layout/DeliveryLayout'
import { fetchDeliveryHistory, fetchDeliveryStats } from '../../services/deliveryApi'
import './DeliveryHistory.css'

export default function DeliveryHistory() {
  const [completedOrders, setCompletedOrders] = useState([])
  const [stats, setStats] = useState({
    total_orders: 0,
    completed_orders: 0,
    active_orders: 0,
    total_earnings: 0,
    average_earning: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      // Load history with filter
      const historyData = await fetchDeliveryHistory(filter)
      setCompletedOrders(historyData.items || [])

      // Load stats
      try {
        const statsData = await fetchDeliveryStats()
        setStats(statsData)
      } catch (statsErr) {
        console.error('Failed to load stats:', statsErr)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
      setError(err.response?.data?.detail || err.message || 'Không thể tải lịch sử giao hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0đ'
    return Number(amount).toLocaleString('vi-VN') + 'đ'
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)

    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <DeliveryLayout>
      <div className="dp-history-page">
        {/* Page Header */}
        <div className="dp-page-header">
          <div className="dp-header-left">
            <h2 className="dp-page-title">Lịch Sử Giao Hàng</h2>
            <span className="dp-order-count">{completedOrders.length} đơn</span>
          </div>
          <div className="dp-earnings-card">
            <div className="dp-earnings-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            </div>
            <div className="dp-earnings-content">
              <span className="dp-earnings-label">Tổng thu nhập</span>
              <span className="dp-earnings-value">{formatCurrency(stats.total_earnings)}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="dp-stats-row">
          <div className="dp-stat-card">
            <div className="dp-stat-icon dp-stat-total">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="dp-stat-info">
              <span className="dp-stat-value">{stats.total_orders}</span>
              <span className="dp-stat-label">Tổng đơn</span>
            </div>
          </div>
          <div className="dp-stat-card">
            <div className="dp-stat-icon dp-stat-completed">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div className="dp-stat-info">
              <span className="dp-stat-value">{stats.completed_orders}</span>
              <span className="dp-stat-label">Hoàn thành</span>
            </div>
          </div>
          <div className="dp-stat-card">
            <div className="dp-stat-icon dp-stat-earnings">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            </div>
            <div className="dp-stat-info">
              <span className="dp-stat-value">{formatCurrency(stats.average_earning)}</span>
              <span className="dp-stat-label">TB/đơn</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="dp-filter-tabs">
          <button
            className={`dp-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả
          </button>
          <button
            className={`dp-filter-tab ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            Hôm nay
          </button>
          <button
            className={`dp-filter-tab ${filter === 'week' ? 'active' : ''}`}
            onClick={() => setFilter('week')}
          >
            7 ngày
          </button>
          <button
            className={`dp-filter-tab ${filter === 'month' ? 'active' : ''}`}
            onClick={() => setFilter('month')}
          >
            30 ngày
          </button>
        </div>

        {/* Orders Table Card */}
        <div className="dp-card">
          <div className="table-responsive">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Cửa Hàng</th>
                  <th>Khách Hàng</th>
                  <th>Địa Chỉ</th>
                  <th>Ngày Hoàn Thành</th>
                  <th>Thu Nhập</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
                      {error}
                    </td>
                  </tr>
                ) : completedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      <div className="dp-empty">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                        </svg>
                        <p>Không có đơn hàng nào trong khoảng thời gian này</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  completedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="dp-order-id">{order.delivery_code}</span>
                      </td>
                      <td>
                        <div className="dp-store-cell">
                          <span className="dp-store-name">{order.store_name}</span>
                          <span className="dp-store-code">{order.store_code}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dp-customer-cell">
                          <span className="dp-customer-name">{order.customer_name}</span>
                          <span className="dp-customer-phone">{order.customer_phone}</span>
                        </div>
                      </td>
                      <td>
                        <span className="dp-address" title={order.customer_address}>
                          {order.customer_address}
                        </span>
                      </td>
                      <td>
                        <span className="dp-date">{formatDateTime(order.completed_at)}</span>
                      </td>
                      <td>
                        <span className="dp-reward">{formatCurrency(order.reward)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DeliveryLayout>
  )
}
