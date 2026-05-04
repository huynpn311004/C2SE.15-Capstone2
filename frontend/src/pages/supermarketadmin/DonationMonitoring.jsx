import { useEffect, useMemo, useState } from 'react'
import { fetchDonationMonitoring, fetchDonationDetail } from '../../services/supermarketAdminApi'
import './DonationMonitoring.css'

const statusBadge = { pending: 'badge-warning', approved: 'badge-info', completed: 'badge-success', rejected: 'badge-danger', received: 'badge-success' }
const statusLabel = { pending: 'Đang Chờ', approved: 'Đã Duyệt', completed: 'Hoàn Thành', rejected: 'Từ Chối', received: 'Đã Nhận' }

export default function DonationMonitoring() {
  const [donations, setDonations] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

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

  function openDetail(donation) {
    setSelectedDonation(donation)
    setShowModal(true)
    setModalLoading(true)
    fetchDonationDetail(donation.id)
      .then((detail) => {
        setSelectedDonation((prev) => prev ? { ...prev, ...detail } : prev)
      })
      .catch(() => {
        setError('Không tải được chi tiết đơn quyên góp')
      })
      .finally(() => {
        setModalLoading(false)
      })
  }

  function closeDetail() {
    setShowModal(false)
    setSelectedDonation(null)
    setError('')
    setModalLoading(false)
  }

  return (
    <div className="sadonmon-page">
      {error && (
        <div className="sadonmon-error-banner">
          <p>{error}</p>
        </div>
      )}

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
                        onClick={() => openDetail(d)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedDonation && (
        <div className="sadonmon-modal-overlay" onClick={closeDetail}>
          <div className="sadonmon-modal" onClick={e => e.stopPropagation()}>
            <div className="sadonmon-modal-header">
              <h3>Chi Tiết Đơn Quyên Góp</h3>
              <button type="button" className="sadonmon-modal-close" onClick={closeDetail}>×</button>
            </div>
            <div className="sadonmon-modal-body">
              {modalLoading ? (
                <div className="sadonmon-modal-loading">
                  <div className="sadonmon-spinner"></div>
                  <span>Đang tải chi tiết...</span>
                </div>
              ) : (
                <>
                  <div className="sadonmon-detail-grid">
                    <div className="sadonmon-detail-field">
                      <label>Mã Đơn</label>
                      <div className="sadonmon-detail-value">
                        <span className="sadonmon-id-badge">{selectedDonation.id}</span>
                      </div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Cửa Hàng</label>
                      <div className="sadonmon-detail-value">{selectedDonation.store}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Tổ Chức Nhận</label>
                      <div className="sadonmon-detail-value">{selectedDonation.recipient}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Liên Hệ</label>
                      <div className="sadonmon-detail-value">{selectedDonation.charityName || '-'}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Số Mặt Hàng</label>
                      <div className="sadonmon-detail-value">{selectedDonation.item_count}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Tổng Số Lượng</label>
                      <div className="sadonmon-detail-value sadonmon-qty-value">{selectedDonation.quantity}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Ngày Tạo</label>
                      <div className="sadonmon-detail-value">{selectedDonation.date}</div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Ngày Nhận Hàng</label>
                      <div className="sadonmon-detail-value">
                        {selectedDonation.receivedDate && selectedDonation.receivedDate !== '-' ? (
                          <span className="sadonmon-received">{selectedDonation.receivedDate}</span>
                        ) : '—'}
                      </div>
                    </div>
                    <div className="sadonmon-detail-field">
                      <label>Trạng Thái</label>
                      <div className="sadonmon-detail-value">
                        <span className={`badge ${statusBadge[selectedDonation.status]}`}>
                          {statusLabel[selectedDonation.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedDonation.items && selectedDonation.items.length > 0 && (
                    <div className="sadonmon-items-section">
                      <h4 className="sadonmon-items-title">Danh Sách Sản Phẩm</h4>
                      <table className="sadonmon-items-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Sản Phẩm</th>
                            <th>SKU</th>
                            <th>Mã Lô</th>
                            <th>Hạn Sử Dụng</th>
                            <th>Số Lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDonation.items.map((item, idx) => (
                            <tr key={item.id}>
                              <td>{idx + 1}</td>
                              <td>{item.productName}</td>
                              <td><code>{item.productSku}</code></td>
                              <td><code>{item.lotCode}</code></td>
                              <td>{item.expiryDate}</td>
                              <td className="sadonmon-item-qty">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {error && <p className="sadonmon-error">{error}</p>}
                </>
              )}
            </div>
            <div className="sadonmon-modal-footer">
              <button type="button" className="sadonmon-btn-cancel" onClick={closeDetail}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
