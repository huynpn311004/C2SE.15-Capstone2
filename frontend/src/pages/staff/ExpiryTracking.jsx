import { useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './ExpiryTracking.css'

const rows = [
  { id: 1, product: 'Sữa Tươi 1L', remainingDays: 14 },
  { id: 2, product: 'Bánh Mì切片', remainingDays: 4 },
  { id: 3, product: 'Phô Mai Viên', remainingDays: 1 },
  { id: 4, product: 'Sữa Chua Đậu Nành', remainingDays: 22 },
]

function getTone(days) {
  if (days <= 2) return { tone: 'danger', text: 'Nguy Cấp', badgeClass: 'badge-danger' }
  if (days <= 7) return { tone: 'warning', text: 'Cảnh Báo', badgeClass: 'badge-warning' }
  return { tone: 'safe', text: 'An Toàn', badgeClass: 'badge-success' }
}

export default function ExpiryTracking() {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all'
    ? rows
    : rows.filter((row) => getTone(row.remainingDays).text === statusFilter)

  return (
    <StaffLayout>
      <div className="expiry-page">
      {/* TOOLBAR */}
      <div className="expiry-toolbar">
        <div className="expiry-filter-group">
          <label>Lọc theo trạng thái:</label>
          <select
            className="expiry-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất Cả</option>
            <option value="An Toàn">An Toàn</option>
            <option value="Cảnh Báo">Cảnh Báo</option>
            <option value="Nguy Cấp">Nguy Cấp</option>
          </select>
        </div>
        <div className="expiry-toolbar-info">
          Hiển thị {filtered.length} sản phẩm
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="expiry-card">
        <div className="expiry-list">
          {filtered.length > 0 ? (
            filtered.map((row) => {
              const status = getTone(row.remainingDays)
              return (
                <div key={row.id} className="expiry-item">
                  <div className="expiry-item-info">
                    <p className="expiry-item-name">{row.product}</p>
                    <p className="expiry-item-remaining">Còn lại: {row.remainingDays} ngày</p>
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
