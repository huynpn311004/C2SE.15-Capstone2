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
            {updateSuccess}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="dp-alert dp-alert-error">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="dp-tabs">
          <button
            className={`dp-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Đơn Đang Giao ({getActiveOrders().length})
          </button>
          <button
            className={`dp-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Hoàn Thành ({getCompletedOrders().length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="dp-toolbar">
          <div className="dp-toolbar-info">
            {loading ? 'Đang tải...' : `Hiển thị ${displayedOrders.length} đơn hàng`}
          </div>
          <div className="dp-toolbar-reward">
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
                            Chi tiết
                          </button>
                          <button
                            onClick={() => openNavigation(order.customer_address)}
                            className="dp-action-btn dp-btn-map"
                            title="Chỉ đường"
                          >
                            Chỉ đường
                          </button>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="dp-action-btn dp-btn-call"
                            title="Gọi điện"
                          >
                            Gọi
                          </a>
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, nextStatusMap[order.status])}
                              className="dp-action-btn dp-btn-confirm"
                              title="Cập nhật trạng thái"
                              disabled={updating}
                            >
                              Cập nhật
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
                    <div className="dp-info-content">
                      <span className="dp-info-label">Trạng thái giao</span>
                      <span className={`dp-badge ${statusBadgeClass[selectedOrder.status] || 'badge-muted'}`}>
                        {statusText[selectedOrder.status] || selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Thanh toán */}
                  <div className="dp-info-card">
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
                    <div className="dp-info-content">
                      <span className="dp-info-label">Thu nhập của bạn</span>
                      <span className="dp-info-value dp-reward-value">{formatCurrency(selectedOrder.reward)}</span>
                    </div>
                  </div>
                </div>

                {/* Cửa hàng */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
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
                      Chỉ đường
                    </button>
                  </div>
                </div>

                {/* Khách hàng */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
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
                        Gọi
                      </a>
                      <button
                        className="dp-nav-btn"
                        onClick={() => openNavigation(selectedOrder.customer_address)}
                      >
                        Chỉ đường
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sản phẩm */}
                <div className="dp-detail-section">
                  <h4 className="dp-section-title">
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
                    <div>
                      <span className="dp-time-label">Thời gian nhận đơn</span>
                      <span className="dp-time-value">{formatDateTime(selectedOrder.assigned_at)}</span>
                    </div>
                  </div>
                  {selectedOrder.delivered_at && (
                    <div className="dp-time-item">
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
