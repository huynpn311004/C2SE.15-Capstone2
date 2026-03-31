import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchInventoryLots } from '../../services/staffApi'
import './ExpiryTracking.css'

function getStatusInfo(expiryDateStr, status) {
  if (status === 'Het Han') {
    return { tone: 'danger', text: 'Đã Hết Hạn', badgeClass: 'badge-danger' }
  }
  if (status === 'Sap Het Han') {
    return { tone: 'warning', text: 'Sắp Hết Hạn', badgeClass: 'badge-warning' }
  }
  return { tone: 'safe', text: 'Còn Hạn', badgeClass: 'badge-success' }
}

function getRemainingDays(expiryDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDateStr)
  expiry.setHours(0, 0, 0, 0)
  const diff = expiry - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ExpiryTracking() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const lots = await fetchInventoryLots()
      setRows(lots)
    } catch (err) {
      console.error('Failed to load inventory lots:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = statusFilter === 'all'
    ? rows
    : rows.filter((row) => {
        const statusInfo = getStatusInfo(row.expiryDate, row.status)
        return statusInfo.text === statusFilter
      })

  return (
    <StaffLayout>
      <div className="expiry-page">
        <div className="expiry-toolbar">
          <div className="expiry-filter-group">
            <label>Lọc theo trạng thái:</label>
            <select
              className="expiry-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất Cả</option>
              <option value="Còn Hạn">Còn Hạn</option>
              <option value="Sắp Hết Hạn">Sắp Hết Hạn</option>
              <option value="Đã Hết Hạn">Đã Hết Hạn</option>
            </select>
          </div>
          <div className="expiry-toolbar-info">
            Hiển thị {filtered.length} sản phẩm
          </div>
        </div>

        <div className="expiry-card">
          <div className="expiry-list">
            {loading ? (
              <div className="empty-cell">Đang tải...</div>
            ) : filtered.length > 0 ? (
              filtered.map((row) => {
                const remainingDays = getRemainingDays(row.expiryDate)
                const status = getStatusInfo(row.expiryDate, row.status)
                return (
                  <div key={row.id} className="expiry-item">
                    <div className="expiry-item-info">
                      <p className="expiry-item-name">{row.productName}</p>
                      <p className="expiry-item-remaining">
                        Mã lô: {row.lotCode} | Còn lại: {remainingDays} ngày
                      </p>
                    </div>
                    <span className={`badge ${status.badgeClass}`}>
                      {status.text}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="empty-cell">Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
