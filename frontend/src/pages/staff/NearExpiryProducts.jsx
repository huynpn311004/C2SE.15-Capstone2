import { useMemo, useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './NearExpiryProducts.css'

const data = [
  { id: 1, product: 'Sữa Chua Hy Lạp', lotCode: 'LH-001', daysLeft: 4, discount: 20 },
  { id: 2, product: 'Salad Hộp', lotCode: 'LH-019', daysLeft: 2, discount: 35 },
  { id: 3, product: 'Bánh Mì Kẹp', lotCode: 'LH-032', daysLeft: 1, discount: 40 },
]

export default function NearExpiryProducts() {
  const [maxDays, setMaxDays] = useState(7)
  const [applied, setApplied] = useState({})

  const filtered = useMemo(() => data.filter((item) => item.daysLeft <= maxDays), [maxDays])

  function applyDiscount(id) {
    setApplied((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <StaffLayout>
      <div className="near-expiry-page">
      {/* TOOLBAR */}
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

      {/* PRODUCT LIST */}
      <div className="near-expiry-card">
        <div className="near-expiry-list">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div key={item.id} className="near-expiry-item">
                <div className="near-expiry-item-info">
                  <p className="near-expiry-item-name">{item.product}</p>
                  <p className="near-expiry-item-detail">
                    {item.lotCode} • Còn {item.daysLeft} ngày
                  </p>
                </div>
                <div className="near-expiry-item-actions">
                  <span className={`badge ${item.daysLeft <= 2 ? 'badge-danger' : 'badge-warning'}`}>
                    Giảm {item.discount}%
                  </span>
                  <button
                    onClick={() => applyDiscount(item.id)}
                    className={`btn-apply ${applied[item.id] ? 'btn-applied' : ''}`}
                  >
                    {applied[item.id] ? 'Đã Áp Dụng' : 'Áp Dụng Giảm Giá'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-cell">Không có dữ liệu</div>
          )}
        </div>
      </div>
      </div>
    </StaffLayout>
  )
}
