import { useEffect, useMemo, useState } from 'react'
import { fetchDonationMonitoring } from '../../services/supermarketAdminApi'
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
  const [selectedDonation, setSelectedDonation] = useState(null)

  useEffect(() => {
    let active = true

    async function loadDonations() {
      try {
        const data = await fetchDonationMonitoring(filter)
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
        <div className="sadonmon-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${filtered.length} đơn`}</div>
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
                  <th>Mã Đơn</th>
                  <th>Siêu Thị</th>
                  <th>Tổ Chức Nhận</th>
                  <th>Số Mặt Hàng</th>
                  <th>Tổng SL</th>
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
                    <td>{d.id}</td>
                    <td><span className="sadonmon-store">{d.store}</span></td>
                    <td>{d.recipient}</td>
                    <td>{d.item_count ?? '-'}</td>
                    <td>{d.quantity}</td>
                    <td>{d.date}</td>
                    <td><span className={`badge ${statusBadge[d.status]}`}>{statusLabel[d.status]}</span></td>
                    <td>
                      <button
                        type="button"
                        className="sadonmon-btn-view"
                        onClick={() => setSelectedDonation(d)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedDonation && (
              <div className="sadonmon-modal-backdrop" onClick={() => setSelectedDonation(null)}>
                <div className="sadonmon-modal" onClick={e => e.stopPropagation()}>
                  <div className="sadonmon-modal-header">
                    <h3>Chi tiết đơn {selectedDonation.id}</h3>
                    <button type="button" className="sadonmon-modal-close" onClick={() => setSelectedDonation(null)}>✕</button>
                  </div>
                  <div className="sadonmon-modal-body">
                    <p><strong>Siêu Thị:</strong> {selectedDonation.store}</p>
                    <p><strong>Tổ Chức Nhận:</strong> {selectedDonation.recipient}</p>
                    <p><strong>Số Mặt Hàng:</strong> {selectedDonation.item_count ?? '-'}</p>
                    <p><strong>Tổng Số Lượng:</strong> {selectedDonation.quantity}</p>
                    <p><strong>Ngày tạo:</strong> {selectedDonation.date}</p>
                    <p><strong>Trạng thái:</strong> {statusLabel[selectedDonation.status]}</p>
                  </div>
                  <div className="sadonmon-modal-footer">
                    <button type="button" className="sadonmon-btn-approve" onClick={() => setSelectedDonation(null)}>Đóng</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
