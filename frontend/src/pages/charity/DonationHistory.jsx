import { useState, useEffect } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import { fetchCharityDonationRequests, confirmDonationReceived } from '../../services/charityApi'
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

  async function handleConfirmReceived(req) {
    if (!window.confirm(`Xác nhận đã nhận hàng "${req.item}" (${req.reqQty} sản phẩm)?`)) {
      return
    }
    setConfirmingId(req.dbId)
    setConfirmSuccess('')
    try {
      await confirmDonationReceived(req.dbId)
      setConfirmSuccess(`Xác nhận thành công yêu cầu YC-${req.dbId}`)
      await loadRequests()
    } catch (err) {
      alert(err?.response?.data?.detail || err.message || 'Xác nhận thất bại')
    } finally {
      setConfirmingId(null)
    }
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
                    <th>Sản Phẩm / Cửa Hàng</th>
                    <th>SL Yêu Cầu</th>
                    <th>Các Mốc Thời Gian</th>
                    <th>Trạng Thái</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map(req => (
                      <tr key={req.id}>
                        <td>
                          <div className="chhistory-item-name">{req.item}</div>
                          <div className="chhistory-item-store">{req.store}</div>
                          {req.supermarket && req.supermarket !== req.store && (
                            <div className="chhistory-item-store chhistory-item-super">{req.supermarket}</div>
                          )}
                        </td>
                        <td className="chhistory-qty">{req.reqQty}</td>
                        <td className="chhistory-dates">
                          <div>Yêu cầu: {req.date}</div>
                          <div className="chhistory-date-approved">Duyệt: {req.approvedDate}</div>
                          <div className="chhistory-date-received">Nhận: {req.receivedDate}</div>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge[req.status]}`}>{statusLabel[req.status]}</span>
                        </td>
                        <td>
                          {req.status === 'approved' && (
                            <button
                              onClick={() => handleConfirmReceived(req)}
                              disabled={confirmingId === req.dbId}
                              className="chhistory-btn-confirm"
                            >
                              {confirmingId === req.dbId ? 'Đang xử lý...' : 'Xác Nhận Đã Nhận'}
                            </button>
                          )}
                          {req.status === 'received' && (
                            <span className="chhistory-received-label">Đã xác nhận</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="chhistory-empty-cell">Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </CharityLayout>
  )
}
