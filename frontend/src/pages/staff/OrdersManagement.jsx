import { useEffect, useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchStaffOrders, updateOrderStatus, fetchOrderDetail } from '../../services/staffApi'
import './OrdersManagement.css'

const statusBadgeClass = {
  pending: 'badge-warning',
  preparing: 'badge-info',
  ready: 'badge-success',
  completed: 'badge-muted',
  cancelled: 'badge-danger',
}

const statusText = {
  pending: 'Chờ Xác Nhận',
  preparing: 'Đang Chuẩn Bị',
  ready: 'Sẵn Sàng',
  completed: 'Hoàn Thành',
  cancelled: 'Đã Hủy',
}

const nextStatusMap = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      setLoading(true)
      const data = await fetchStaffOrders()
      setOrders(data)
    } catch (err) {
      setError('Không thể tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(id, nextStatus) {
    try {
      setUpdating(true)
      await updateOrderStatus(id, nextStatus)
      setOrders((prev) => prev.map((order) =>
        order.orderId === id ? { ...order, status: nextStatus } : order
      ))
      if (selectedOrder?.orderId === id) {
        setSelectedOrder((prev) => prev && { ...prev, status: nextStatus })
      }
      setSuccess('Cập nhật trạng thái thành công')
      setTimeout(() => {
        setShowModal(false)
        setSelectedOrder(null)
        setSuccess('')
      }, 800)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Cập nhật trạng thái thất bại')
    } finally {
      setUpdating(false)
    }
  }

  function openDetail(order) {
    setSelectedOrder(order)
    setError('')
    setSuccess('')
    setModalLoading(true)
    setShowModal(true)
    fetchOrderDetail(order.orderId)
      .then((detail) => {
        setSelectedOrder((prev) => prev ? { ...prev, ...detail } : prev)
      })
      .catch(() => {
        setError('Không tải được chi tiết đơn hàng')
      })
      .finally(() => {
        setModalLoading(false)
      })
  }

  function closeDetail() {
    setShowModal(false)
    setSelectedOrder(null)
    setError('')
    setSuccess('')
    setModalLoading(false)
  }

  return (
    <StaffLayout>
      <div className="orders-page">
        {/* TOOLBAR */}
        <div className="orders-toolbar">
          <div className="orders-toolbar-info">
            Hiển thị {orders.length} đơn hàng
          </div>
        </div>

        {error && <div className="orders-alert orders-alert-error">{error}</div>}
        {success && <div className="orders-alert orders-alert-success">{success}</div>}

        {/* CARD + TABLE */}
        <div className="orders-card">
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Trạng Thái</th>
                  <th>Tổng Tiền</th>
                  <th>Ngày Tạo</th>
                  <th>Ngày Giao Thành Công</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="orders-empty-cell">
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="orders-empty-cell">
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  orders.map((order, index) => (
                    <tr key={order.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="orders-id-badge">{order.id}</span>
                      </td>
                      <td>{order.customer}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass[order.status] || 'badge-muted'}`}>
                          {statusText[order.status] || order.status}
                        </span>
                      </td>
                      <td>{order.amount}</td>
                      <td>{order.createdAt}</td>
                      <td>
                        {order.deliveredAt ? (
                          <span className="orders-delivered">{order.deliveredAt}</span>
                        ) : (
                          <span className="orders-pending-date">—</span>
                        )}
                      </td>
                      <td className="orders-actions">
                        <button
                          className="orders-btn-view"
                          onClick={() => openDetail(order)}
                        >
                          <svg className="orders-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>
                          </svg>
                          Xem
                        </button>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <button
                            className="orders-btn-update"
                            onClick={() => handleUpdateStatus(order.orderId, nextStatusMap[order.status])}
                            disabled={updating}
                          >
                            <svg className="orders-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {updating ? 'Đang cập nhật...' : 'Cập Nhật'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết đơn hàng */}
      {showModal && selectedOrder && (
        <div className="orders-modal-overlay" onClick={closeDetail}>
          <div className="orders-modal" onClick={(e) => e.stopPropagation()}>
            <div className="orders-modal-header">
              <h3>Chi Tiết Đơn Hàng</h3>
              <button className="orders-modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="orders-modal-body">
              {modalLoading ? (
                <div className="orders-modal-loading">
                  <div className="orders-spinner"></div>
                  <span>Đang tải chi tiết đơn hàng...</span>
                </div>
              ) : (
                <>
              <div className="orders-detail-grid">
                <div className="orders-detail-field">
                  <label>Mã Đơn</label>
                  <div className="orders-detail-value">
                    <span className="orders-id-badge">{selectedOrder.id}</span>
                  </div>
                </div>
                <div className="orders-detail-field">
                  <label>Khách Hàng</label>
                  <div className="orders-detail-value">{selectedOrder.customer}</div>
                </div>
                <div className="orders-detail-field">
                  <label>Số Điện Thoại</label>
                  <div className="orders-detail-value">{selectedOrder.phone}</div>
                </div>
                <div className="orders-detail-field">
                  <label>Trạng Thái</label>
                  <div className="orders-detail-value">
                    {statusText[selectedOrder.status] || selectedOrder.status}
                  </div>
                </div>
                <div className="orders-detail-field">
                  <label>Tổng Tiền</label>
                  <div className="orders-detail-value orders-amount-value">{selectedOrder.amount}</div>
                </div>
                <div className="orders-detail-field">
                  <label>Thanh Toán</label>
                  <div className="orders-detail-value">
                    {selectedOrder.paymentMethodText || selectedOrder.paymentMethod || '—'}
                  </div>
                </div>
                <div className="orders-detail-field">
                  <label>Trạng Thái Thanh Toán</label>
                  <div className="orders-detail-value">
                    {selectedOrder.paymentStatus === 'paid' ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                  </div>
                </div>
                <div className="orders-detail-field">
                  <label>Ngày Tạo</label>
                  <div className="orders-detail-value">{selectedOrder.createdAt}</div>
                </div>
                <div className="orders-detail-field">
                  <label>Ngày Giao Thành Công</label>
                  <div className="orders-detail-value">
                    {selectedOrder.deliveredAt
                      ? <span className="orders-delivered">{selectedOrder.deliveredAt}</span>
                      : <span className="orders-pending-date">—</span>
                    }
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="orders-items-section">
                  <h4 className="orders-items-title">Danh Sách Sản Phẩm</h4>
                  <table className="orders-items-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Sản Phẩm</th>
                        <th>Số Lượng</th>
                        <th>Đơn Giá</th>
                        <th>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unitPrice}</td>
                          <td className="orders-item-price">{item.subtotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {error && <p className="orders-error">{error}</p>}
                </>
              )}
            </div>
            <div className="orders-modal-footer">
              {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                <button
                  className="orders-btn-confirm"
                  onClick={() => handleUpdateStatus(selectedOrder.orderId, nextStatusMap[selectedOrder.status])}
                  disabled={updating}
                >
                  {updating ? 'Đang cập nhật...' : 'Cập Nhật Trạng Thái'}
                </button>
              )}
              <button className="orders-btn-cancel" onClick={closeDetail}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  )
}
