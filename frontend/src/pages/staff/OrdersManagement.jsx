import { useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './OrdersManagement.css'

const initialOrders = [
  { id: 'DH-1001', customer: 'Nguyễn Minh', status: 'Chờ Xác Nhận', items: 3, amount: '420,000 VNĐ' },
  { id: 'DH-1002', customer: 'Lê Trang', status: 'Đã Xác Nhận', items: 2, amount: '185,000 VNĐ' },
  { id: 'DH-1003', customer: 'Phạm Huy', status: 'Đang Chuẩn Bị', items: 5, amount: '690,000 VNĐ' },
]

const statusBadgeClass = {
  'Chờ Xác Nhận': 'badge-warning',
  'Đã Xác Nhận': 'badge-success',
  'Đang Chuẩn Bị': 'badge-info',
  'Hoàn Thành': 'badge-muted',
}

const nextStatusMap = {
  'Chờ Xác Nhận': 'Đã Xác Nhận',
  'Đã Xác Nhận': 'Đang Chuẩn Bị',
  'Đang Chuẩn Bị': 'Hoàn Thành',
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)

  function updateStatus(id, next) {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status: next } : order)))
    if (selectedOrder?.id === id) {
      setSelectedOrder((prev) => prev && { ...prev, status: next })
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
      {/* TOOLBAR */}
      <div className="orders-toolbar">
        <div className="orders-toolbar-info">
          Hiển thị {orders.length} đơn hàng
        </div>
      </div>

      {/* TABLE */}
      <div className="orders-card">
        <div className="table-responsive">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng</th>
                <th>Trạng Thái</th>
                <th>Số Món</th>
                <th>Tổng Tiền</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="order-id">{order.id}</span>
                  </td>
                  <td>{order.customer}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.items}</td>
                  <td>{order.amount}</td>
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
                      {order.status !== 'Hoàn Thành' && (
                        <button
                          onClick={() => updateStatus(order.id, nextStatusMap[order.status])}
                          className="action-btn icon-action-btn btn-confirm-small"
                          title="Cập nhật trạng thái"
                          aria-label="Cập nhật trạng thái"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
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
                    <span className={`badge ${statusBadgeClass[selectedOrder.status]}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
                <div className="orders-detail-field">
                  <label>Số Món</label>
                  <div className="orders-detail-value">{selectedOrder.items}</div>
                </div>
                <div className="orders-detail-field">
                  <label>Tổng Tiền</label>
                  <div className="orders-detail-value">{selectedOrder.amount}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedOrder.status !== 'Hoàn Thành' && (
                <button
                  className="btn-large btn-confirm"
                  onClick={() => updateStatus(selectedOrder.id, nextStatusMap[selectedOrder.status])}
                >
                  Cập Nhật Trạng Thái
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
