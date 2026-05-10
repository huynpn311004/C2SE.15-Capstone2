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
  vnpay: 'VNPay',
}

const paymentStatusText = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
}

const nextStatusText = {
  assigned: 'Xác nhận lấy hàng',
  pending: 'Xác nhận lấy hàng',
  picking_up: 'Giao hàng',
  preparing: 'Giao hàng',
  picked_up: 'Giao hàng',
  delivering: 'Giao hàng thành công',
  shipped: 'Giao hàng thành công',
  ready: 'Giao hàng thành công',
}



const nextStatusMap = {
  assigned: 'picking_up',
  pending: 'picking_up',
  picking_up: 'delivering',
  preparing: 'delivering',
  picked_up: 'delivering',
  delivering: 'completed',
  shipped: 'completed',
  ready: 'completed',
}

function Toast({ message, visible, onClose }) {
  if (!visible) return null;
  
  const isError = message.includes('thất bại') || message.includes('Lỗi') || message.includes('không xác định') || message.includes('Không thể');

  return (
    <div className={`dp-orders-toast ${isError ? 'error' : 'success'}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {!isError ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </span>
        <p className="toast-message">{message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

export default function DeliveryOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [toast, setToast] = useState({ visible: false, message: '' })

  const showToast = (msg) => {
    setToast({ visible: true, message: msg })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500)
  }

  async function loadOrders() {
    try {
      setLoading(true)
      const data = await fetchDeliveryOrders()
      setOrders(data.items || [])
    } catch (err) {
      const errorData = err.response?.data?.detail
      let msg = 'Không thể tải đơn hàng'
      if (typeof errorData === 'string') {
        msg = errorData
      } else if (errorData) {
        msg = typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData)
      } else {
        msg = err.message || msg
      }
      showToast(msg)
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
    console.log(`[DELIVERY] Updating ${id} to ${newStatus}`)
    if (!newStatus) {
      showToast('Trạng thái tiếp theo không xác định.')
      return
    }

    setUpdating(true)

    try {
      const result = await updateDeliveryStatus(id, newStatus)
      setOrders(prev =>
        prev.map(o => (o.id === id ? { ...o, status: newStatus } : o))
      )

      // Cập nhật dữ liệu modal nếu đang mở
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }

      showToast(result.message || `Cập nhật đơn thành công!`)
    } catch (err) {
      console.error('Failed to update status:', err)
      const errorData = err.response?.data?.detail
      let msg = 'Cập nhật thất bại'
      if (typeof errorData === 'string') {
        msg = errorData
      } else if (errorData) {
        // Tránh render object trực tiếp làm sập React
        msg = typeof errorData === 'object' ? JSON.stringify(errorData) : String(errorData)
      } else {
        msg = err.message || msg
      }
      showToast(msg)
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
                          {order.status !== 'completed' && order.status !== 'cancelled' && nextStatusMap[order.status] && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, nextStatusMap[order.status])}
                              className="dp-action-btn dp-btn-confirm"
                              title={`Cập nhật thành: ${statusText[nextStatusMap[order.status]]}`}
                              disabled={updating}
                            >
                              {nextStatusText[order.status] || 'Cập nhật'}
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
                      className="dp-action-btn dp-btn-map"
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
                        className="dp-action-btn dp-btn-map"
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
                    }}
                    disabled={updating}
                  >
                    {updating ? 'Đang cập nhật...' : (nextStatusText[selectedOrder.status] || 'Cập Nhật Trạng Thái')}
                  </button>
                )}
                <button className="dp-btn dp-btn-secondary" onClick={closeDetail}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
        <Toast visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      </div>
    </DeliveryLayout>
  )
}
