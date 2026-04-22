import { useState, useEffect, useMemo } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchInventoryLots } from '../../services/staffApi'
import './ExpiryTracking.css'

function getStatusInfo(status) {
  if (status === 'Het Han') {
    return { text: 'Đã Hết Hạn', badgeClass: 'badge-danger' }
  }
  if (status === 'Sap Het Han') {
    return { text: 'Sắp Hết Hạn', badgeClass: 'badge-warning' }
  }
  return { text: 'Còn Hạn', badgeClass: 'badge-success' }
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
  const [daysFilter, setDaysFilter] = useState(0) // 0 = all

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

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const statusInfo = getStatusInfo(row.status)
      const daysLeft = getRemainingDays(row.expiryDate)

      const matchStatus =
        statusFilter === 'all' || statusInfo.text === statusFilter

      const matchDays =
        daysFilter === 0 || (daysLeft >= 0 && daysLeft <= daysFilter)

      return matchStatus && matchDays
    })
  }, [rows, statusFilter, daysFilter])

  return (
    <StaffLayout>
      <div className="expiry-page">
        <div className="expiry-toolbar">
          <div className="expiry-filters">
            <div className="expiry-filter-group">
              <label>Trạng thái:</label>
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

            <div className="expiry-filter-group">
              <label>Còn lại:</label>
              <select
                className="expiry-filter-select"
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
              >
                <option value={0}>Tất cả</option>
                <option value={3}>&le; 3 ngày</option>
                <option value={7}>&le; 7 ngày</option>
                <option value={14}>&le; 14 ngày</option>
              </select>
            </div>
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
                const status = getStatusInfo(row.status)
                const discountPercent = row.discount ?? 0

                return (
                  <div key={row.id} className="expiry-item">
                    <div className="expiry-item-info">
                      <p className="expiry-item-name">{row.productName}</p>
                      <p className="expiry-item-remaining">
                        Mã lô: {row.lotCode} | Còn lại: {remainingDays} ngày
                        {discountPercent > 0 && (
                          <span className="discount-tag">
                            {' '}· Giảm {Math.round(discountPercent)}%
                          </span>
                        )}
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
