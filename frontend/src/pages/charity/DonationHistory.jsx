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
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirmingId, setConfirmingId] = useState(null)
  const [confirmSuccess, setConfirmSuccess] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

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
    setConfirmSuccess('')
    try {
      await confirmDonationReceived(requestId)
      setConfirmSuccess(`Xác nhận thành công yêu cầu YC-${requestId}`)
      await loadRequests()
    } catch (err) {
      alert(err?.response?.data?.detail || err.message || 'Xác nhận thất bại')
    } finally {
      setConfirmingId(null)
    }
  }

  async function openRequestDetail(req) {
    const requestId = req.dbId || req.id
    setDetailError('')
    setSelectedRequest(null)
    setDetailLoading(true)
    try {
      const detail = await fetchCharityDonationRequestDetail(requestId)
      setSelectedRequest(detail)
    } catch (err) {
      setDetailError(err?.response?.data?.detail || err.message || 'Không thể tải chi tiết yêu cầu')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeRequestDetail() {
    setSelectedRequest(null)
    setDetailError('')
  }

  return (
    <CharityLayout>
      <div className="chhistory-page">
        {/* TOOLBAR */}
        <div className="chhistory-toolbar">
          <div className="chhistory-filter-group">
            <label>Lọc theo trạng thái:</label>
            <select className="chhistory-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất Cả</option>
              <option value="pending">Đang Chờ</option>
              <option value="approved">Đã Duyệt</option>
              <option value="received">Đã Nhận</option>
              <option value="rejected">Từ Chối</option>
            </select>
          </div>
          <div className="chhistory-toolbar-info">Hiển thị {filtered.length} yêu cầu</div>
        </div>

        {/* CONFIRM SUCCESS */}
        {confirmSuccess && (
          <div className="chhistory-success-banner">{confirmSuccess}</div>
        )}

        {/* LOADING / ERROR */}
        {loading && (
          <div className="chhistory-loading">
            <div className="spinner"></div>
            <span>Đang tải dữ liệu...</span>
          </div>
        )}

        {!loading && error && (
          <div className="chhistory-error-banner">
            <p>{error}</p>
            <button onClick={loadRequests} className="chhistory-retry-btn">Thử lại</button>
          </div>
        )}

        {/* TABLE */}
        {!loading && !error && (
          <div className="chhistory-card">
            <div className="table-responsive">
              <table className="chhistory-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Số lượng sản phẩm</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map(req => {
                      const requestId = req.dbId || req.id
                      const reqQty = getRequestQuantity(req)
                      const statusKey = req.status || 'pending'

                      return (
                        <tr key={requestId}>
                          <td className="chhistory-order-code">YC-{requestId}</td>
                          <td className="chhistory-qty">{reqQty}</td>
                          <td>
                            <span className={`badge ${statusBadge[statusKey]}`}>{statusLabel[statusKey]}</span>
                          </td>
                          <td className="chhistory-action-cell">
                            <button
                              type="button"
                              className="chhistory-btn-view"
                              onClick={() => openRequestDetail(req)}
                            >
                              Xem
                            </button>
                            {statusKey === 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmReceived(req)}
                                disabled={confirmingId === requestId}
                                className="chhistory-btn-confirm"
                              >
                                {confirmingId === requestId ? 'Đang xử lý...' : 'Xác nhận'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="chhistory-empty-cell">Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {selectedRequest && (
                <div className="chhistory-modal-backdrop" onClick={closeRequestDetail}>
                  <div className="chhistory-modal" onClick={e => e.stopPropagation()}>
                    <div className="chhistory-modal-header">
                      <h3>Chi tiết yêu cầu YC-{selectedRequest.id}</h3>
                      <button className="chhistory-modal-close" onClick={closeRequestDetail}>×</button>
                    </div>
                    <div className="chhistory-modal-body">
                      {detailLoading ? (
                        <div className="chhistory-loading">
                          <div className="spinner"></div>
                          <span>Đang tải chi tiết...</span>
                        </div>
                      ) : detailError ? (
                        <div className="chhistory-error-banner">{detailError}</div>
                      ) : (
                        <div className="chhistory-detail-grid">
                          <div><strong>Mã đơn:</strong> YC-{selectedRequest.id}</div>
                          <div><strong>Trạng thái:</strong> {selectedRequest.status}</div>
                          <div><strong>Ngày tạo:</strong> {selectedRequest.createdAt || selectedRequest.created_at}</div>
                          <div><strong>SL sản phẩm:</strong> {selectedRequest.total_items || selectedRequest.totalItems || selectedRequest.items?.length || 0}</div>
                          <div className="chhistory-detail-items">
                            <h4>Danh sách sản phẩm</h4>
                            <table className="chhistory-detail-table">
                              <thead>
                                <tr>
                                  <th>Sản phẩm</th>
                                  <th>Số lượng</th>
                                  <th>Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(selectedRequest.items || []).map(item => (
                                  <tr key={item.id}>
                                    <td>{item.product_name || item.product || ''}</td>
                                    <td>{item.quantity || item.qty || ''}</td>
                                    <td>{item.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CharityLayout>
  )
}
