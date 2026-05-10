import { useState, useEffect } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import { fetchCharityDonationRequests, fetchCharityDonationRequestDetail, confirmDonationReceived } from '../../services/charityApi'
import './DonationHistory.css'

const statusBadge = {
  pending: 'badge-warning',
  approved: 'badge-info',
  received: 'badge-success',
  rejected: 'badge-danger',
}

const statusLabel = {
  pending: 'Đang Chờ',
  approved: 'Đã Duyệt',
  received: 'Đã Nhận',
  rejected: 'Từ Chối',
}

export default function DonationHistory() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  async function loadRequests() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCharityDonationRequests()
      setRequests(data || [])
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể tải danh sách yêu cầu')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  function getRequestQuantity(req) {
    if (req.reqQty || req.total_items || req.totalItems) {
      return req.reqQty || req.total_items || req.totalItems
    }
    if (!req.items?.length) {
      return 0
    }
    return req.items.reduce((sum, item) => {
      const qty = item.quantity ?? item.qty ?? 1
      const parsed = typeof qty === 'number' ? qty : parseInt(qty, 10)
      return sum + (Number.isFinite(parsed) ? parsed : 0)
    }, 0)
  }

  async function handleConfirmReceived(req) {
    const requestId = req.dbId || req.id
    const quantity = getRequestQuantity(req)
    if (!window.confirm(`Xác nhận đã nhận hàng "${req.item || req.items?.[0]?.product_name || ''}" (${quantity} sản phẩm)?`)) {
      return
    }
    setConfirmingId(requestId)
    setSuccess('')
    setError('')
    try {
      await confirmDonationReceived(requestId)
      setSuccess(`Xác nhận thành công yêu cầu YC-${requestId}`)
      await loadRequests()
      setTimeout(() => {
        setShowModal(false)
        setSelectedRequest(null)
        setSuccess('')
      }, 800)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Xác nhận thất bại')
    } finally {
      setConfirmingId(null)
    }
  }

  function openDetail(req) {
    const requestId = req.dbId || req.id
    setSelectedRequest(req)
    setError('')
    setSuccess('')
    setDetailLoading(true)
    setShowModal(true)
    fetchCharityDonationRequestDetail(requestId)
      .then((detail) => {
        setSelectedRequest((prev) => prev ? { ...prev, ...detail } : prev)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || 'Không tải được chi tiết yêu cầu')
      })
      .finally(() => {
        setDetailLoading(false)
      })
  }

  function closeDetail() {
    setShowModal(false)
    setSelectedRequest(null)
    setError('')
    setSuccess('')
    setDetailLoading(false)
  }

  return (
    <CharityLayout>
      <div className="orders-page">
        {/* TOOLBAR */}
        <div className="orders-toolbar">
          <div className="orders-toolbar-info">
            Hiển thị {filtered.length} yêu cầu
          </div>
          <div className="chhistory-filter-group">
            <select className="chhistory-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất Cả</option>
              <option value="pending">Đang Chờ</option>
              <option value="approved">Đã Duyệt</option>
              <option value="received">Đã Nhận</option>
              <option value="rejected">Từ Chối</option>
            </select>
          </div>
        </div>



        {/* CARD + TABLE */}
        <div className="orders-card">
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã Đơn</th>
                  <th>Số Lượng</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="orders-empty-cell">
                      Đang tải danh sách yêu cầu...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="orders-empty-cell">
                      Chưa có yêu cầu nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req, index) => {
                    const requestId = req.dbId || req.id
                    const reqQty = getRequestQuantity(req)
                    const statusKey = req.status || 'pending'

                    return (
                      <tr key={requestId}>
                        <td>{index + 1}</td>
                        <td>
                          <span className="orders-id-badge">YC-{requestId}</span>
                        </td>
                        <td className="chhistory-qty">{reqQty}</td>
                        <td>
                          <span className={`badge ${statusBadge[statusKey]}`}>
                            {statusLabel[statusKey]}
                          </span>
                        </td>
                        <td className="orders-actions">
                          <button
                            className="orders-btn-view"
                            onClick={() => openDetail(req)}
                          >
                            <svg className="orders-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                            Xem
                          </button>
                          {statusKey === 'approved' && (
                            <button
                              className="orders-btn-update"
                              onClick={() => handleConfirmReceived(req)}
                              disabled={confirmingId === requestId}
                            >
                              <svg className="orders-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                              {confirmingId === requestId ? 'Đang xử lý...' : 'Xác Nhận'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết yêu cầu */}
      {showModal && selectedRequest && (
        <div className="orders-modal-overlay" onClick={closeDetail}>
          <div className="orders-modal" onClick={(e) => e.stopPropagation()}>
            <div className="orders-modal-header">
              <h3>Chi Tiết Yêu Cầu</h3>
              <button className="orders-modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="orders-modal-body">
              {detailLoading ? (
                <div className="orders-modal-loading">
                  <div className="orders-spinner"></div>
                  <span>Đang tải chi tiết yêu cầu...</span>
                </div>
              ) : (
                <>
                  <div className="orders-detail-grid">
                    <div className="orders-detail-field">
                      <label>Mã Đơn</label>
                      <div className="orders-detail-value">
                        <span className="orders-id-badge">YC-{selectedRequest.id}</span>
                      </div>
                    </div>
                    <div className="orders-detail-field">
                      <label>Trạng Thái</label>
                      <div className="orders-detail-value">
                        <span className={`badge ${statusBadge[selectedRequest.status]}`}>
                          {statusLabel[selectedRequest.status]}
                        </span>
                      </div>
                    </div>
                    <div className="orders-detail-field">
                      <label>Ngày Tạo</label>
                      <div className="orders-detail-value">
                        {selectedRequest.createdAt || selectedRequest.created_at || '—'}
                      </div>
                    </div>
                    <div className="orders-detail-field">
                      <label>Số Lượng Sản Phẩm</label>
                      <div className="orders-detail-value">
                        {selectedRequest.total_items || selectedRequest.totalItems || selectedRequest.items?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Danh sách sản phẩm */}
                  {selectedRequest.items && selectedRequest.items.length > 0 && (
                    <div className="orders-items-section">
                      <h4 className="orders-items-title">Danh Sách Sản Phẩm</h4>
                      <table className="orders-items-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Sản Phẩm</th>
                            <th>Số Lượng</th>
                            <th>Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRequest.items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td>{idx + 1}</td>
                              <td>{item.product_name || item.product || '—'}</td>
                              <td>{item.quantity || item.qty || '—'}</td>
                              <td>
                                <span className={`badge ${statusBadge[item.status] || 'badge-muted'}`}>
                                  {statusLabel[item.status] || item.status || '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="orders-modal-footer">
              {selectedRequest.status === 'approved' && (
                <button
                  className="orders-btn-confirm"
                  onClick={() => handleConfirmReceived(selectedRequest)}
                  disabled={confirmingId === (selectedRequest.dbId || selectedRequest.id)}
                >
                  {confirmingId === (selectedRequest.dbId || selectedRequest.id) ? 'Đang xử lý...' : 'Xác Nhận Đã Nhận'}
                </button>
              )}
              <button className="orders-btn-cancel" onClick={closeDetail}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {(success || error) && (
        <div className={`orders-toast ${success ? 'success' : 'error'}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {success ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              )}
            </span>
            <p className="toast-message">{success || error}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => { setSuccess(''); setError(''); }}>×</button>
        </div>
      )}
    </CharityLayout>
  )
}
