import { useEffect, useMemo, useState } from 'react'
import { fetchExpiringProducts, fetchSupermarketStores } from '../../services/supermarketAdminApi'
import './ExpiringProducts.css'

const urgencyConfig = {
  critical: { label: 'Nguy cấp', color: '#dc2626', bg: '#fef2f2' },
  warning: { label: 'Sắp hết', color: '#d97706', bg: '#fffbeb' },
  caution: { label: 'Cần lưu ý', color: '#2563eb', bg: '#eff6ff' },
}

export default function ExpiringProducts() {
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(7)
  const [storeFilter, setStoreFilter] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const [productsData, storesData] = await Promise.all([
          fetchExpiringProducts(days, storeFilter || null),
          fetchSupermarketStores(),
        ])
        if (!active) return
        setProducts(productsData.items || [])
        setStores(storesData || [])
        setError('')
      } catch (err) {
        if (!active) return
        console.error('Failed to load expiring products:', err)
        setError(err.message || 'Không thể tải dữ liệu')
        setProducts([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [days, storeFilter])

  const summary = useMemo(() => {
    const items = products
    return {
      critical: items.filter(p => p.urgency === 'critical').reduce((s, p) => s + p.quantity, 0),
      warning: items.filter(p => p.urgency === 'warning').reduce((s, p) => s + p.quantity, 0),
      caution: items.filter(p => p.urgency === 'caution').reduce((s, p) => s + p.quantity, 0),
      total: items.reduce((s, p) => s + p.quantity, 0),
      totalValue: items.reduce((s, p) => s + (p.quantity * p.basePrice), 0),
    }
  }, [products])

  return (
    <div className="expprod-page">
      {error && (
        <div className="expprod-error-banner">
          <p>{error}</p>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="expprod-toolbar">
        <div className="expprod-filter-group">
          <label>Số ngày:</label>
          <select
            className="expprod-filter-select"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={3}>3 ngày</option>
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={30}>30 ngày</option>
          </select>
        </div>
        <div className="expprod-filter-group">
          <label>Cửa hàng:</label>
          <select
            className="expprod-filter-select"
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
          >
            <option value="">Tất cả cửa hàng</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="expprod-stats">
        <div className="expprod-stat-card expprod-stat-critical">
          <div className="expprod-stat-value">{summary.critical}</div>
          <div className="expprod-stat-label">Nguy cấp (≤3 ngày)</div>
        </div>
        <div className="expprod-stat-card expprod-stat-warning">
          <div className="expprod-stat-value">{summary.warning}</div>
          <div className="expprod-stat-label">Sắp hết (4-7 ngày)</div>
        </div>
        <div className="expprod-stat-card expprod-stat-total">
          <div className="expprod-stat-value">{summary.total}</div>
          <div className="expprod-stat-label">Tổng sản phẩm sắp hết hạn</div>
        </div>
        <div className="expprod-stat-card expprod-stat-value">
          <div className="expprod-stat-value">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.totalValue)}
          </div>
          <div className="expprod-stat-label">Tổng giá trị tồn kho</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="expprod-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</div>
        ) : (
          <div className="expprod-table-responsive">
            <table className="expprod-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Cửa hàng</th>
                  <th>SL tồn</th>
                  <th>Giá bán</th>
                  <th>Ngày hết hạn</th>
                  <th>Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                      Không có sản phẩm nào sắp hết hạn trong {days} ngày tới.
                    </td>
                  </tr>
                )}
                {products.map(p => {
                  const cfg = urgencyConfig[p.urgency] || urgencyConfig.caution
                  return (
                    <tr key={`${p.lotId}-${p.productId}`}>
                      <td>
                        {p.productImage ? (
                          <img
                            src={p.productImage}
                            alt={p.productName}
                            className="expprod-product-img"
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="expprod-product-placeholder">No Image</div>
                        )}
                      </td>
                      <td>
                        <div className="expprod-product-name">{p.productName}</div>
                        <div className="expprod-product-category">{p.category}</div>
                      </td>
                      <td><code>{p.productSku}</code></td>
                      <td>{p.storeName}</td>
                      <td className="expprod-qty">{p.quantity}</td>
                      <td>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.basePrice)}
                      </td>
                      <td>{p.expiryDate}</td>
                      <td>
                        <span className="expprod-days" style={{ color: cfg.color }}>
                          {p.daysRemaining} ngày
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
