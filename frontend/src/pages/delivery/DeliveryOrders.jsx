import { useEffect, useState } from 'react'
import DeliveryLayout from '../../components/layout/DeliveryLayout'
import {
  fetchDeliveryOrders,
  updateDeliveryStatus,
  fetchDeliveryDetail,
} from '../../services/deliveryApi'
import './DeliveryOrders.css'

const statusBadgeClass = {
  assigned: 'badge-warning',
  pending: 'badge-warning',
  picking_up: 'badge-info',
  preparing: 'badge-info',
  delivering: 'badge-orange',
  ready: 'badge-orange',
  completed: 'badge-success',
  cancelled: 'badge-muted',
}

const statusText = {
  assigned: 'Chờ Nhận',
  pending: 'Chờ Nhận',
  picking_up: 'Đang Lấy Hàng',
  preparing: 'Đang Lấy Hàng',
  delivering: 'Đang Giao',
  ready: 'Đang Giao',
  completed: 'Hoàn Thành',
  cancelled: 'Đã Hủy',
}

const paymentMethodText = {
  cod: 'Tiền mặt (COD)',
  momo: 'MoMo',
}

const paymentStatusText = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
}

const nextStatusMap = {
  assigned: 'picking_up',
  pending: 'picking_up',
  picking_up: 'delivering',
  preparing: 'delivering',
  delivering: 'completed',
  ready: 'completed',
}

export default function DeliveryOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [updateSuccess, setUpdateSuccess] = useState('')
  const [error, setError] = useState('')

  async function loadOrders() {
    try {
      setLoading(true)
      setError('')
      const data = await fetchDeliveryOrders()
      setOrders(data.items || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError(err.response?.data?.detail || err.message || 'Không thể tải đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  function getActiveOrders() {
    return orders.filter(
      order => order.status !== 'completed' && order.status !== 'cancelled'
    )
  }

  function getCompletedOrders() {
    return orders.filter(order => order.status === 'completed')
  }

  async function handleUpdateStatus(id, newStatus) {
    setUpdating(true)
    setUpdateSuccess('')

    try {
      const result = await updateDeliveryStatus(id, newStatus)
      setOrders(prev =>
        prev.map(o => (o.id === id ? { ...o, status: newStatus } : o))
      )
      setUpdateSuccess(result.message || `Cập nhật đơn thành công!`)

      if (newStatus === 'completed') {
        setTimeout(() => setUpdateSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      setError(err.response?.data?.detail || err.message || 'Cập nhật thất bại')
      setTimeout(() => setError(''), 3000)
    } finally {
      setUpdating(false)
    }
  }

  async function openDetail(order) {
    try {
      const detail = await fetchDeliveryDetail(order.id)
      setSelectedOrder(detail)
      setShowModal(true)
    } catch (err) {
      console.error('Failed to load detail:', err)
      setSelectedOrder(order)
      setShowModal(true)
    }
  }

  function closeDetail() {
    setShowModal(false)
    setSelectedOrder(null)
  }

  function openNavigation(address) {
    if (!address || address === 'Không có địa chỉ') return
    const encodedAddress = encodeURIComponent(address)
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      '_blank'
    )
  }

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

  const displayedOrders = activeTab === 'active' ? getActiveOrders() : getCompletedOrders()
  const totalReward = displayedOrders.reduce((sum, o) => sum + (o.reward || 0), 0)

  return (
    <DeliveryLayout>
      <div className="dp-orders-page">
        {/* Success Message */}
        {updateSuccess && (
          <div className="dp-alert dp-alert-success">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            {updateSuccess}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="dp-alert dp-alert-error">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="dp-tabs">
          <button
            className={`dp-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            Đơn Đang Giao ({getActiveOrders().length})
          </button>
          <button
            className={`dp-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Hoàn Thành ({getCompletedOrders().length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="dp-toolbar">
          <div className="dp-toolbar-info">
            {loading ? 'Đang tải...' : `Hiển thị ${displayedOrders.length} đơn hàng`}
          </div>
          <div className="dp-toolbar-reward">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
            </svg>
            <span>Thu nhập:</span>
            <strong>{totalReward.toLocaleString('vi-VN')}đ</strong>
          </div>
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
                  <th>Trạng Thái</th>
                  <th>Tổng Tiền</th>
                  <th>Thu Nhập</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
                      {error}
                    </td>
                  </tr>
                ) : displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      <div className="dp-empty">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                        </svg>
                        <p>
                          {activeTab === 'active'
                            ? 'Không có đơn đang giao'
                            : 'Chưa có đơn hàng nào hoàn thành'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((order) => (
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
                        <span className={`dp-badge ${statusBadgeClass[order.status] || 'badge-muted'}`}>
                          {statusText[order.status] || order.status}
                        </span>
                      </td>
                      <td>
                        <span className="dp-amount">{formatCurrency(order.total_amount)}</span>
                      </td>
                      <td>
                        <span className="dp-reward">{formatCurrency(order.reward)}</span>
                      </td>
                      <td>
                        <div className="dp-action-group">
                          <button
                            onClick={() => openDetail(order)}
                            className="dp-action-btn dp-btn-view"
                            title="Chi tiết"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openNavigation(order.customer_address)}
                            className="dp-action-btn dp-btn-map"
                            title="Chỉ đường"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                            </svg>
                          </button>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="dp-action-btn dp-btn-call"
                            title="Gọi điện"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                            </svg>
                          </a>
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, nextStatusMap[order.status])}
                              className="dp-action-btn dp-btn-confirm"
                              title="Cập nhật trạng thái"
                              disabled={updating}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Chi Tiết */}
        {showModal && selectedOrder && (
          <div className="dp-modal-overlay" onClick={closeDetail}>
            <div className="dp-modal dp-modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="dp-modal-header">
                <h3>Chi Tiết Đơn Hàng {selectedOrder.delivery_code}</h3>
                <button className="dp-modal-close" onClick={closeDetail}>✕</button>
              </div>
              <div className="dp-modal-body">
                {/* Progress Stepper */}
                <div className="dp-progress">
                  <div className={`dp-progress-step ${selectedOrder.status !== 'assigned' ? 'done' : ''}`}>
                    <div className="dp-progress-icon">1</div>
                    <span>Lấy hàng</span>
                  </div>
                  <div className="dp-progress-line"></div>
                  <div className={`dp-progress-step ${selectedOrder.status === 'delivering' || selectedOrder.status === 'completed' ? 'done' : ''}`}>
                    <div className="dp-progress-icon">2</div>
                    <span>Đang giao</span>
                  </div>
                  <div className="dp-progress-line"></div>
                  <div className={`dp-progress-step ${selectedOrder.status === 'completed' ? 'done' : ''}`}>
                    <div className="dp-progress-icon">3</div>
                    <span>Hoàn tất</span>
                  </div>
                </div>

                {/* Info Cards Row */}
                <div className="dp-info-cards">
                  {/* Trạng thái */}
                  <div className="dp-info-card dp-info-status">
                    <div className="dp-info-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <div className="dp-info-content">
                      <span className="dp-info-label">Trạng thái giao</span>
                      <span className={`dp-badge ${statusBadgeClass[selectedOrder.status] || 'badge-muted'}`}>
                        {statusText[selectedOrder.status] || selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Thanh toán */}
                  <div className="dp-info-card">
                    <div className="dp-info-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                      </svg>
                    </div>
                    <div className="dp-info-content">
                      <span className="dp-info-label">Thanh toán</span>
                      <span className="dp-info-value">{paymentMethodText[selectedOrder.payment_method] || selectedOrder.payment_method}</span>
                      <span className={`dp-badge-small ${selectedOrder.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {paymentStatusText[selectedOrder.payment_status] || selectedOrder.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Thu nhập */}
                  <div className="dp-info-card dp-info-reward">
                    <div className="dp-info-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <div className="dp-info-content">
                      <span className="dp-info-label">Thu nhập của bạn</span>
                      <span className="dp-info-value dp-reward-value">{formatCurrency(selectedOrder.reward)}</span>
                    </div>
                  </div>
                </div>

                {/* Cửa hàng */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                    </svg>
                    Lấy hàng tại
                  </h4>
                  <div className="dp-location-card">
                    <div className="dp-location-main">
                      <strong>{selectedOrder.store_name}</strong>
                      <span>Mã cửa hàng: {selectedOrder.store_code}</span>
                      {selectedOrder.supermarket_name && (
                        <span>Siêu thị: {selectedOrder.supermarket_name}</span>
                      )}
                      <span className="dp-location-address">{selectedOrder.store_address}</span>
                    </div>
                    <button
                      className="dp-nav-btn"
                      onClick={() => openNavigation(selectedOrder.store_address)}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Khách hàng */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    Giao đến
                  </h4>
                  <div className="dp-location-card">
                    <div className="dp-location-main">
                      <strong>{selectedOrder.customer_name}</strong>
                      <a href={`tel:${selectedOrder.customer_phone}`} className="dp-phone">
                        {selectedOrder.customer_phone}
                      </a>
                      <span className="dp-location-address">{selectedOrder.customer_address}</span>
                    </div>
                    <div className="dp-location-actions">
                      <a href={`tel:${selectedOrder.customer_phone}`} className="dp-action-btn dp-btn-call">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </a>
                      <button
                        className="dp-nav-btn"
                        onClick={() => openNavigation(selectedOrder.customer_address)}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sản phẩm */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                    Sản phẩm ({selectedOrder.quantity} sản phẩm)
                  </h4>
                  <div className="dp-items-list">
                    {selectedOrder.items_list && selectedOrder.items_list.length > 0 ? (
                      selectedOrder.items_list.map((item, index) => (
                        <div key={index} className="dp-item-row">
                          <span className="dp-item-name">{item.product_name}</span>
                          <span className="dp-item-qty">x{item.quantity}</span>
                          <span className="dp-item-price">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="dp-item-row">{selectedOrder.items}</div>
                    )}
                    <div className="dp-item-total">
                      <span>Tổng cộng:</span>
                      <strong>{formatCurrency(selectedOrder.total_amount)}</strong>
                    </div>
                  </div>
                </div>

                {/* Thời gian */}
                <div className="dp-time-section">
                  <div className="dp-time-item">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    <div>
                      <span className="dp-time-label">Thời gian nhận đơn</span>
                      <span className="dp-time-value">{formatDateTime(selectedOrder.assigned_at)}</span>
                    </div>
                  </div>
                  {selectedOrder.delivered_at && (
                    <div className="dp-time-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <div>
                        <span className="dp-time-label">Thời gian giao</span>
                        <span className="dp-time-value">{formatDateTime(selectedOrder.delivered_at)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="dp-modal-footer">
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <button
                    className="dp-btn dp-btn-primary"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, nextStatusMap[selectedOrder.status])
                      closeDetail()
                    }}
                    disabled={updating}
                  >
                    {updating ? 'Đang cập nhật...' : 'Cập Nhật Trạng Thái'}
                  </button>
                )}
                <button className="dp-btn dp-btn-secondary" onClick={closeDetail}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DeliveryLayout>
  )
}
