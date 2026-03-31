import { useMemo, useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchInventoryLots } from '../../services/staffApi'
import './NearExpiryProducts.css'

export default function NearExpiryProducts() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [maxDays, setMaxDays] = useState(7)
  const [applied, setApplied] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const data = await fetchInventoryLots('Sap Het Han')
      setLots(data)
    } catch (err) {
      console.error('Failed to load near expiry products:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return lots.filter((item) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiry = new Date(item.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      return daysLeft <= maxDays && daysLeft >= 0
    })
  }, [lots, maxDays])

  function applyDiscount(id) {
    setApplied((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <StaffLayout>
      <div className="near-expiry-page">
        <div className="near-expiry-toolbar">
          <div className="near-expiry-filter-group">
            <label>Lọc theo số ngày:</label>
            <select
              className="near-expiry-filter-select"
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
            >
              <option value={3}>≤ 3 ngày</option>
              <option value={7}>≤ 7 ngày</option>
              <option value={14}>≤ 14 ngày</option>
            </select>
          </div>
          <div className="near-expiry-toolbar-info">
            Hiển thị {filtered.length} sản phẩm
          </div>
        </div>

        <div className="near-expiry-card">
          <div className="near-expiry-list">
            {loading ? (
              <div className="empty-cell">Đang tải...</div>
            ) : filtered.length > 0 ? (
              filtered.map((item) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const expiry = new Date(item.expiryDate)
                expiry.setHours(0, 0, 0, 0)
                const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
                const discount = daysLeft <= 2 ? 40 : daysLeft <= 4 ? 30 : 20

                return (
                  <div key={item.id} className="near-expiry-item">
                    <div className="near-expiry-item-info">
                      <p className="near-expiry-item-name">{item.productName}</p>
                      <p className="near-expiry-item-detail">
                        {item.lotCode} • Còn {daysLeft} ngày
                      </p>
                    </div>
                    <div className="near-expiry-item-actions">
                      <span className={`badge ${daysLeft <= 2 ? 'badge-danger' : 'badge-warning'}`}>
                        Giảm {discount}%
                      </span>
                      <button
                        onClick={() => applyDiscount(item.id)}
                        className={`btn-apply ${applied[item.id] ? 'btn-applied' : ''}`}
                      >
                        {applied[item.id] ? 'Đã Áp Dụng' : 'Áp Dụng Giảm Giá'}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-cell">Không có sản phẩm sắp hết hạn</div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
