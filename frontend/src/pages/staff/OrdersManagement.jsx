import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchStaffOrders, updateOrderStatus } from '../../services/staffApi'
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
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      setLoading(true)
      const data = await fetchStaffOrders()
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
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
    } catch (err) {
      console.error('Failed to update order status:', err)
      alert('Cập nhật trạng thái thất bại')
    } finally {
      setUpdating(false)
    }
  }

  function openDetail(order) {
    setSelectedOrder(order)
    setShowModal(true)
  }

  function closeDetail() {
    setShowModal(false)
    setSelectedOrder(null)
  }

  return (
    <StaffLayout>
      <div className="orders-page">
        <div className="orders-toolbar">
          <div className="orders-toolbar-info">
            {loading ? 'Đang tải...' : `Hiển thị ${orders.length} đơn hàng`}
          </div>
        </div>

        <div className="orders-card">
          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Trạng Thái</th>
                  <th>Tổng Tiền</th>
                  <th>Ngày Tạo</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>Đang tải...</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>Không có đơn hàng</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="order-id">{order.id}</span>
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
                        <div className="action-group">
                          <button
                            onClick={() => openDetail(order)}
                            className="action-btn icon-action-btn btn-view"
                            title="Chi tiết"
                            aria-label="Chi tiết"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(order.orderId, nextStatusMap[order.status])}
                              className="action-btn icon-action-btn btn-confirm-small"
                              title="Cập nhật trạng thái"
                              aria-label="Cập nhật trạng thái"
                              disabled={updating}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M20 6L9 17l-5-5" />
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

        {showModal && selectedOrder && (
          <div className="orders-modal-overlay" onClick={closeDetail}>
            <div className="orders-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi Tiết Đơn Hàng {selectedOrder.id}</h3>
                <button className="modal-close" onClick={closeDetail}>✕</button>
              </div>
              <div className="modal-body">
                <div className="orders-detail-grid">
                  <div className="orders-detail-field">
                    <label>Khách Hàng</label>
                    <div className="orders-detail-value">{selectedOrder.customer}</div>
                  </div>
                  <div className="orders-detail-field">
                    <label>Trạng Thái</label>
                    <div className="orders-detail-value">
                      <span className={`badge ${statusBadgeClass[selectedOrder.status] || 'badge-muted'}`}>
                        {statusText[selectedOrder.status] || selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  <div className="orders-detail-field">
                    <label>Tổng Tiền</label>
                    <div className="orders-detail-value">{selectedOrder.amount}</div>
                  </div>
                  <div className="orders-detail-field">
                    <label>Ngày Tạo</label>
                    <div className="orders-detail-value">{selectedOrder.createdAt}</div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <button
                    className="btn-large btn-confirm"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.orderId, nextStatusMap[selectedOrder.status])
                    }}
                    disabled={updating}
                  >
                    {updating ? 'Đang cập nhật...' : 'Cập Nhật Trạng Thái'}
                  </button>
                )}
                <button className="btn-large btn-close" onClick={closeDetail}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  )
}
