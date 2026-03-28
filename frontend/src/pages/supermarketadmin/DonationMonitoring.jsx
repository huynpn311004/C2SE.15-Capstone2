import { useEffect, useMemo, useState } from 'react'
import { fetchSupermarketAuditLogs } from '../../services/supermarketAdminApi'
import './DonationMonitoring.css'

const statusBadge = { pending: 'badge-warning', approved: 'badge-info', completed: 'badge-success', rejected: 'badge-danger' }
const statusLabel = { pending: 'Đang Chờ', approved: 'Đã Duyệt', completed: 'Hoàn Thành', rejected: 'Từ Chối' }

export default function DonationMonitoring() {
  const [donations, setDonations] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadDonations() {
      try {
        const logs = await fetchSupermarketAuditLogs(200)
        if (!active) return
        const mapped = logs
          .filter((item) => /donat|charity|quyen/i.test(item.action || ''))
          .map((item) => ({
            id: item.id,
            store: item.entityType || 'N/A',
            donor: item.actor || 'N/A',
            recipient: item.actor || 'N/A',
            items: item.action || '-',
            quantity: 1,
            date: item.time || '-',
            status: 'completed',
            type: 'out',
          }))
        setDonations(mapped)
      } catch {
        if (!active) return
        setDonations([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDonations()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? donations : donations.filter(d => d.status === filter)),
    [donations, filter],
  )

  function approve(id) {
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d))
  }

  function reject(id) {
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d))
  }

  return (
    <div className="sadonmon-page">
      {/* TOOLBAR */}
      <div className="sadonmon-toolbar">
        <div className="sadonmon-filter-group">
          <label>Lọc:</label>
          <select className="sadonmon-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tất Cả</option>
            <option value="pending">Đang Chờ</option>
            <option value="approved">Đã Duyệt</option>
            <option value="completed">Hoàn Thành</option>
            <option value="rejected">Từ Chối</option>
          </select>
        </div>
        <div className="sadonmon-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${filtered.length} donation`}</div>
      </div>

      {/* SUMMARY */}
      <div className="sadonmon-stats">
        <div className="sadonmon-stat-card">
          <div className="sadonmon-stat-value">{donations.filter(d => d.status === 'completed').length}</div>
          <div className="sadonmon-stat-label">Hoàn Thành</div>
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
        <div className="table-responsive">
          <table className="sadonmon-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Tổ Chức Nhận</th>
                <th>Sản Phẩm</th>
                <th>Số Lượng</th>
                <th>Ngày</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="7">Không có dữ liệu donation.</td>
                </tr>
              )}
              {filtered.map(d => (
                <tr key={d.id}>
                  <td><span className="sadonmon-store">{d.store}</span></td>
                  <td>{d.recipient}</td>
                  <td>{d.items}</td>
                  <td>{d.quantity}</td>
                  <td>{d.date}</td>
                  <td><span className={`badge ${statusBadge[d.status]}`}>{statusLabel[d.status]}</span></td>
                  <td>
                    <div className="action-group">
                      {d.status === 'pending' && (
                        <>
                          <button onClick={() => approve(d.id)} className="action-btn icon-action-btn btn-approve" title="Duyệt">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                          </button>
                          <button onClick={() => reject(d.id)} className="action-btn icon-action-btn btn-reject" title="Từ chối">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
