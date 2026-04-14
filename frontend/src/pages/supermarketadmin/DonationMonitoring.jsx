import { useEffect, useMemo, useState } from 'react'
import { fetchDonationMonitoring, updateDonationStatus } from '../../services/supermarketAdminApi'
import './DonationMonitoring.css'

const statusBadge = { pending: 'badge-warning', approved: 'badge-info', completed: 'badge-success', rejected: 'badge-danger', received: 'badge-success' }
const statusLabel = { pending: 'Đang Chờ', approved: 'Đã Duyệt', completed: 'Hoàn Thành', rejected: 'Từ Chối', received: 'Đã Nhận' }

function getUserId() {
  try {
    const raw = localStorage.getItem('seims_auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id || null
  } catch {
    return null
  }
}

export default function DonationMonitoring() {
  const [donations, setDonations] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null) // Track which donation is being updated

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setUpdating(requestId)
      const userId = getUserId()
      if (!userId) throw new Error('Không tìm thấy user')
      await updateDonationStatus(userId, requestId, newStatus)
      // Refresh the donation list after successful update
      const data = await fetchDonationMonitoring(userId, filter)
      setDonations(data)
      setError('')
    } catch (err) {
      console.error('Failed to update status:', err)
      setError(err.message || 'Không thể cập nhật trạng thái')
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    let active = true

    async function loadDonations() {
      try {
        const userId = getUserId()
        if (!userId) throw new Error('Không tìm thấy user')
        const data = await fetchDonationMonitoring(userId, filter)
        if (!active) return
        setDonations(data)
        setError('')
      } catch (err) {
        if (!active) return
        console.error('Failed to load donations:', err)
        setError(err.message || 'Không thể tải dữ liệu')
        setDonations([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDonations()
    return () => {
      active = false
    }
  }, [filter])

  const filtered = useMemo(
    () => (filter === 'all' ? donations : donations.filter(d => d.status === filter)),
    [donations, filter],
  )

  return (
    <div className="sadonmon-page">
      {/* ERROR MESSAGE */}
      {error && (
        <div className="sadonmon-error-banner">
          <p>{error}</p>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="sadonmon-toolbar">
        <div className="sadonmon-filter-group">
          <label>Lọc:</label>
          <select className="sadonmon-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tất Cả</option>
            <option value="pending">Đang Chờ</option>
            <option value="approved">Đã Duyệt</option>
            <option value="received">Đã Nhận</option>
            <option value="rejected">Từ Chối</option>
          </select>
        </div>
        <div className="sadonmon-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${filtered.length} donation`}</div>
      </div>

      {/* SUMMARY */}
      <div className="sadonmon-stats">
        <div className="sadonmon-stat-card">
          <div className="sadonmon-stat-value">{donations.filter(d => d.status === 'received').length}</div>
          <div className="sadonmon-stat-label">Đã Nhận</div>
        </div>
        <div className="sadonmon-stat-card">
          <div className="sadonmon-stat-value">{donations.filter(d => d.status === 'approved').length}</div>
          <div className="sadonmon-stat-label">Đã Duyệt</div>
        </div>
        <div className="sadonmon-stat-card">
          <div className="sadonmon-stat-value">{donations.filter(d => d.status === 'pending').length}</div>
          <div className="sadonmon-stat-label">Đang Chờ</div>
        </div>
        <div className="sadonmon-stat-card">
          <div className="sadonmon-stat-value">{donations.reduce((s, d) => s + d.quantity, 0)}</div>
          <div className="sadonmon-stat-label">Tổng Sản Phẩm</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="sadonmon-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</div>
        ) : (
          <div className="table-responsive">
            <table className="sadonmon-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Tổ Chức Nhận</th>
                  <th>Sản Phẩm</th>
                  <th>Số Lượng</th>
                  <th>HSD</th>
                  <th>Ngày</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu donation.</td>
                  </tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td><span className="sadonmon-store">{d.store}</span></td>
                    <td>{d.recipient}</td>
                    <td>{d.items}</td>
                    <td>{d.quantity}</td>
                    <td>{d.exp}</td>
                    <td>{d.date}</td>
                    <td><span className={`badge ${statusBadge[d.status]}`}>{statusLabel[d.status]}</span></td>
                    <td className="sadonmon-actions">
                      {d.status === 'pending' && (
                        <>
                          <button
                            className="sadonmon-btn-approve"
                            onClick={() => handleStatusUpdate(d.id, 'approved')}
                            disabled={updating === d.id}
                            title="Duyệt đơn"
                          >
                            {updating === d.id ? 'Đang xử lý...' : 'Duyệt'}
                          </button>
                          <button
                            className="sadonmon-btn-reject"
                            onClick={() => handleStatusUpdate(d.id, 'rejected')}
                            disabled={updating === d.id}
                            title="Từ chối đơn"
                          >
                            {updating === d.id ? 'Đang xử lý...' : 'Từ Chối'}
                          </button>
                        </>
                      )}
                      {d.status === 'approved' && (
                        <span className="sadonmon-status-text">Đã duyệt</span>
                      )}
                      {d.status === 'rejected' && (
                        <span className="sadonmon-status-text">Đã từ chối</span>
                      )}
                      {d.status === 'received' && (
                        <span className="sadonmon-status-text">Đã nhận</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
