import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../services/AuthContext'
import { fetchSupermarketDashboardSummary, fetchWalletHistory } from '../../services/supermarketAdminApi'
import './SupermarketAdminDashboard.css'

function fmtCurrency(v) {
  return Number(v || 0).toLocaleString('vi-VN') + 'đ'
}

function SimpleBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="simple-bar-wrap">
      <div className="simple-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function SupermarketAdminDashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('daily')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMoney, setShowMoney] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [walletHistory, setWalletHistory] = useState([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [storeFilter, setStoreFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const result = await fetchSupermarketDashboardSummary(period)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail || err.message || 'Lỗi tải dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [period])

  useEffect(() => {
    if (activeTab === 'wallet') {
      loadWalletHistory()
    }
  }, [activeTab, storeFilter])

  async function loadWalletHistory() {
    try {
      setWalletLoading(true)
      const sid = storeFilter === 'all' ? null : storeFilter
      const history = await fetchWalletHistory(50, sid)
      setWalletHistory(history)
    } catch (err) {
      console.error('Lỗi tải lịch sử ví:', err)
    } finally {
      setWalletLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!data) return []
    const s = data.stats
    return [
      { label: 'Tổng Store', value: s.totalStores, color: 'teal' },
      { label: 'Nhân Viên', value: s.totalStaff, color: 'blue' },
      { label: 'Sản Phẩm', value: s.totalProducts, color: 'purple' },
      { label: 'Sắp Hết Hạn', value: s.nearExpiry, color: s.nearExpiry > 0 ? 'orange' : 'teal' },
    ]
  }, [data])

  const orderStats = useMemo(() => {
    if (!data) return []
    const s = data.stats
    return [
      { label: 'Tổng Đơn', value: s.totalOrders, color: 'teal' },
      { label: 'Đơn Hoàn Thành', value: s.completedOrders, color: 'green' },
      { label: 'Doanh Thu', value: fmtCurrency(s.totalRevenue), color: 'blue', isMoney: true },
      { label: 'Số Dư Ví', value: fmtCurrency(s.walletBalance), color: 'warning', isMoney: true },
      { label: 'Quyên Góp', value: s.donationCount, color: 'purple' },
    ]
  }, [data])

  const maxStoreOrders = useMemo(() => {
    if (!data?.storeStats) return 0
    return Math.max(...data.storeStats.map(s => Math.max(s.orders, s.donations * 10)), 1)
  }, [data])

  return (
    <div className="sadashboard-page">
      {/* PERIOD FILTER */}
      <div className="sadashboard-header">
        <div className="sadashboard-period-filter">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'daily' ? 'Ngày' : p === 'weekly' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* LOADING / ERROR */}
      {loading && (
        <div className="sadashboard-loading">
          <div className="sa-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      )}

      {error && (
        <div className="sadashboard-error">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {/* STATS ROW 1 — Supermarket */}
          <div className="sadashboard-stats">
            {stats.map((s, i) => (
              <div key={i} className="sadashboard-stat-card">
                <div className={`sadashboard-stat-value sad-stat-${s.color}`}>{s.value}</div>
                <div className="sadashboard-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* STATS ROW 2 — Orders & Revenue */}
          <div className="sadashboard-stats sadashboard-stats-secondary">
            {orderStats.map((s, i) => (
              <div key={i} className="sadashboard-stat-card sad-stat-card-secondary">
                <div className="sadashboard-stat-header-row">
                  <span className={`sadashboard-stat-value sad-stat-${s.color}`}>
                    {s.isMoney ? (showMoney ? s.value : '******đ') : s.value}
                  </span>
                  {s.isMoney && (
                    <button 
                      className="sad-eye-btn" 
                      onClick={() => setShowMoney(!showMoney)}
                      title={showMoney ? "Ẩn số tiền" : "Hiện số tiền"}
                    >
                      {showMoney ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                <div className="sadashboard-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div className="sadashboard-tabs">
            <button className={`sad-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Tổng Quan</button>
            <button className={`sad-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>Đơn Hàng</button>
            <button className={`sad-tab ${activeTab === 'donations' ? 'active' : ''}`} onClick={() => setActiveTab('donations')}>Quyên Góp</button>
            <button className={`sad-tab ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>Ví & Giao Dịch</button>
          </div>

          {/* TAB CONTENT */}
          <div className="sadashboard-content">
            {activeTab === 'overview' && (
              <div className="sadashboard-content-grid">
                <div className="sadashboard-card sad-full-card">
                  <h3 className="sadashboard-card-title">So Sánh Store — Đơn Hàng vs Quyên Góp</h3>
                  <div className="sad-chart-area">
                    {data.storeStats.length === 0 ? (
                      <div className="sad-empty">Chưa có dữ liệu store.</div>
                    ) : (
                      <div className="sad-bar-chart">
                        {data.storeStats.map((store) => (
                          <div key={store.id} className="sad-bar-row">
                            <div className="sad-bar-label" title={store.name}>{store.name}</div>
                            <div className="sad-bar-track">
                              <div
                                className="sad-bar-segment sad-bar-sales"
                                style={{ width: `${(store.orders / maxStoreOrders) * 100}%` }}
                                title={`${store.orders} đơn`}
                              />
                              <div
                                className="sad-bar-segment sad-bar-donation"
                                style={{ width: `${(store.donations * 10 / maxStoreOrders) * 100}%` }}
                                title={`${store.donations} quyên góp`}
                              />
                            </div>
                            <div className="sad-bar-values">
                              <span className="sad-val-sales">{store.orders} đơn</span>
                              <span className="sad-val-donation">{store.donations} QG</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="sad-chart-legend">
                      <span className="sad-legend-item"><span className="sad-legend-dot sad-legend-sales" />Đơn hàng</span>
                      <span className="sad-legend-item"><span className="sad-legend-dot sad-legend-donation" />Quyên góp</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="sadashboard-content-grid">
                <div className="sadashboard-card sad-full-card">
                  <h3 className="sadashboard-card-title">Đơn Hàng Theo Store</h3>
                  <div className="sad-table-wrap">
                    <table className="sad-table">
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Đơn Hàng</th>
                          <th>Doanh Thu</th>
                          <th>Tỷ Lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.storeStats.length === 0 ? (
                          <tr><td colSpan="4" className="sad-td-empty">Chưa có đơn hàng.</td></tr>
                        ) : (
                          data.storeStats.map(store => {
                            const rate = store.orders > 0
                              ? ((store.donations * 10 / store.orders) * 100).toFixed(1) + '%'
                              : '0%'
                            return (
                              <tr key={store.id}>
                                <td className="sad-td-name">{store.name}</td>
                                <td><strong>{store.orders}</strong></td>
                                <td className="sad-td-revenue">{fmtCurrency(store.revenue)}</td>
                                <td><SimpleBar value={store.orders} max={maxStoreOrders} color="var(--sa-teal)" /></td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'donations' && (
              <div className="sadashboard-content-grid">
                <div className="sadashboard-card sad-half-card">
                  <h3 className="sadashboard-card-title">Tổng Quan Quyên Góp</h3>
                  <div className="sad-metric-list">
                    <div className="sad-metric-row">
                      <span>Đơn quyên góp</span>
                      <strong>{data.stats.donationCount}</strong>
                    </div>
                    <div className="sad-metric-row">
                      <span>Tổng sản phẩm quyên góp</span>
                      <strong>{data.stats.donationProducts}</strong>
                    </div>
                    <div className="sad-metric-row">
                      <span>Sản phẩm sắp hết hạn</span>
                      <strong className={data.stats.nearExpiry > 0 ? 'text-orange' : ''}>{data.stats.nearExpiry}</strong>
                    </div>
                    <div className="sad-metric-row">
                      <span>Tổng cửa hàng</span>
                      <strong>{data.stats.totalStores}</strong>
                    </div>
                    <div className="sad-metric-row">
                      <span>Tổng nhân viên</span>
                      <strong>{data.stats.totalStaff}</strong>
                    </div>
                  </div>
                </div>

                <div className="sadashboard-card sad-half-card">
                  <h3 className="sadashboard-card-title">Tỷ Lệ Quyên Góp Theo Store</h3>
                  <div className="sad-table-wrap">
                    <table className="sad-table">
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Quyên Góp</th>
                          <th>Đơn Hàng</th>
                          <th>Tỷ Lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.storeStats.length === 0 ? (
                          <tr><td colSpan="4" className="sad-td-empty">Không có dữ liệu.</td></tr>
                        ) : (
                          data.storeStats.map(store => {
                            const rate = store.orders > 0
                              ? ((store.donations * 10 / store.orders) * 100).toFixed(1) + '%'
                              : '0%'
                            return (
                              <tr key={store.id}>
                                <td className="sad-td-name">{store.name}</td>
                                <td><strong>{store.donations}</strong></td>
                                <td>{store.orders}</td>
                                <td><SimpleBar value={store.donations * 10} max={store.orders || 1} color="var(--sa-purple)" /></td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="sadashboard-content-grid">
                <div className="sadashboard-card sad-full-card">
                  <div className="sad-card-header-flex">
                    <div className="sad-header-left">
                      <h3 className="sadashboard-card-title">Biến Động Số Dư Ví</h3>
                      <div className="sad-store-filter-wrap">
                        <select 
                          className="sad-store-select" 
                          value={storeFilter} 
                          onChange={(e) => setStoreFilter(e.target.value)}
                        >
                          <option value="all">Tất cả cửa hàng</option>
                          {data?.storeStats?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button className="sad-refresh-btn" onClick={loadWalletHistory} disabled={walletLoading}>
                      {walletLoading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                  </div>
                  
                  <div className="sad-table-wrap">
                    <table className="sad-table">
                      <thead>
                        <tr>
                          <th>Thời Gian</th>
                          <th>Loại</th>
                          <th>Mã Đơn</th>
                          <th>Cửa Hàng</th>
                          <th>Nội Dung</th>
                          <th className="text-right">Số Tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletLoading && walletHistory.length === 0 ? (
                          <tr><td colSpan="6" className="sad-td-empty">Đang tải lịch sử...</td></tr>
                        ) : walletHistory.length === 0 ? (
                          <tr><td colSpan="6" className="sad-td-empty">Chưa có giao dịch nào.</td></tr>
                        ) : (
                          walletHistory.map(tx => (
                            <tr key={tx.id}>
                              <td className="sad-td-time">{tx.createdAt}</td>
                              <td>
                                <span className={`sad-tx-badge tx-${tx.type}`}>
                                  {(tx.type === 'order_income' || tx.type === 'order_payment') ? 'Doanh Thu' : 
                                   tx.type === 'refund' ? 'Hoàn Tiền' : 
                                   tx.type === 'commission' ? 'Hoa Hồng' : tx.type}
                                </span>
                              </td>
                              <td><span className="sad-tx-order-code">{tx.orderCode}</span></td>
                              <td>{tx.storeName}</td>
                              <td className="sad-td-desc">{tx.description}</td>
                              <td className={`sad-td-amount text-right ${tx.amount >= 0 ? 'text-green' : 'text-red'}`}>
                                {tx.amount >= 0 ? '+' : ''}{showMoney ? fmtCurrency(tx.amount) : '******đ'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
