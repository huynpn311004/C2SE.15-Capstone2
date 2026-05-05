import { useEffect, useMemo, useState } from 'react'
import { fetchSupermarketReports } from '../../services/supermarketAdminApi'
import './SupermarketReports.css'

function formatCurrency(value) {
  if (!value && value !== 0) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

function formatPercent(value) {
  if (!value && value !== 0) return '0%'
  return `${Number(value).toFixed(1)}%`
}

export default function SupermarketReports() {
  const [reports, setReports] = useState({ stats: {}, growth: {}, storeStats: [] })
  const [reportSeries, setReportSeries] = useState({
    '7d': { stats: {} },
    '30d': { stats: {} },
    '90d': { stats: {} },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadReports() {
      try {
        const [data30d, data7d, data90d] = await Promise.all([
          fetchSupermarketReports('30d'),
          fetchSupermarketReports('7d'),
          fetchSupermarketReports('90d'),
        ])
        if (!active) return
        setReports(data30d || { stats: {}, growth: {}, storeStats: [] })
        setReportSeries({
          '7d': data7d || { stats: {} },
          '30d': data30d || { stats: {} },
          '90d': data90d || { stats: {} },
        })
      } catch {
        if (!active) return
        setReports({ stats: {}, growth: {}, storeStats: [] })
        setReportSeries({
          '7d': { stats: {} },
          '30d': { stats: {} },
          '90d': { stats: {} },
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReports()
    return () => {
      active = false
    }
  }, [])

  const storePerformance = useMemo(
    () => (reports.storeStats || []).map((item) => {
      const orders = Number(item.orders || 0)
      return {
        name: item.name,
        orders,
        growth: item.revenue > 0 ? '+' : '0%',
        status: orders > 0 ? 'active' : 'warning',
      }
    }),
    [reports.storeStats],
  )

  const periodData = useMemo(
    () => [
      {
        label: '7 ngày',
        revenue: reportSeries['7d']?.stats?.totalRevenue || 0,
        orders: reportSeries['7d']?.stats?.totalOrders || 0,
      },
      {
        label: '30 ngày',
        revenue: reportSeries['30d']?.stats?.totalRevenue || 0,
        orders: reportSeries['30d']?.stats?.totalOrders || 0,
      },
      {
        label: '90 ngày',
        revenue: reportSeries['90d']?.stats?.totalRevenue || 0,
        orders: reportSeries['90d']?.stats?.totalOrders || 0,
      },
    ],
    [reportSeries],
  )

  const maxRevenue = Math.max(1, ...periodData.map((d) => d.revenue))
  const maxOrders = Math.max(1, ...periodData.map((d) => d.orders))
  const currentRevenue = formatCurrency(reports.stats?.totalRevenue)
  const currentOrders = reports.stats?.totalOrders || 0
  const completedOrders = reports.stats?.completedOrders || 0
  const deliveryRate = currentOrders > 0 ? ((completedOrders / currentOrders) * 100).toFixed(1) + '%' : '0%'
  const activeStaff = reports.stats?.totalStaff || 0
  const revenueTrend = formatPercent(reports.growth?.revenue)
  const ordersTrend = formatPercent(reports.growth?.orders)

  return (
    <div className="sareport-page">
      {/* SUMMARY STATS */}
      <div className="sareport-stats">
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">{currentRevenue}</div>
          <div className="sareport-stat-label">Tổng Doanh Thu</div>
        </div>
        <div className="sareport-stat-card sareport-stat-success">
          <div className="sareport-stat-value">{currentOrders}</div>
          <div className="sareport-stat-label">Tổng Đơn Hàng</div>
        </div>
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">{deliveryRate}</div>
          <div className="sareport-stat-label">Tỷ Lệ Hoàn Thành</div>
        </div>
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">{activeStaff}</div>
          <div className="sareport-stat-label">Nhân Viên Hoạt Động</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="sareport-charts-grid">
        {/* Revenue Chart */}
        <div className="sareport-card">
          <h3 className="sareport-card-title">Xu Hướng 7/30/90 Ngày</h3>
          <div className="sareport-chart-area">
            {periodData.map((d) => (
              <div key={d.label} className="sareport-chart-col">
                <div className="sareport-chart-bar-group">
                  <div className="sareport-chart-bar" style={{ height: `${(d.revenue / maxRevenue) * 100}%` }} title={`Doanh thu: ${formatCurrency(d.revenue)}`} />
                  <div className="sareport-chart-bar-recovered" style={{ height: `${(d.orders / maxOrders) * 100}%` }} title={`Đơn hàng: ${d.orders}`} />
                </div>
                <span className="sareport-chart-label">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="sareport-chart-legend">
            <span className="sareport-legend-item"><span className="sareport-legend-dot sareport-legend-revenue" />Doanh thu</span>
            <span className="sareport-legend-item"><span className="sareport-legend-dot sareport-legend-recovered" />Đơn hàng</span>
          </div>
        </div>

        {/* Trends */}
        <div className="sareport-card">
          <h3 className="sareport-card-title">Chỉ Số So Với Kỳ Trước</h3>
          <div className="sareport-track-list">
            <div className="sareport-track-item">
              <div className="sareport-track-info">
                <span className="sareport-track-name">Xu hướng doanh thu</span>
                <span className="sareport-track-detail">{revenueTrend}</span>
              </div>
              <span className={`badge ${revenueTrend.startsWith('-') ? 'badge-warning' : 'badge-success'}`}>
                {revenueTrend.startsWith('-') ? 'Giảm' : 'Tăng'}
              </span>
            </div>
            <div className="sareport-track-item">
              <div className="sareport-track-info">
                <span className="sareport-track-name">Xu hướng đơn hàng</span>
                <span className="sareport-track-detail">{ordersTrend}</span>
              </div>
              <span className={`badge ${ordersTrend.startsWith('-') ? 'badge-warning' : 'badge-success'}`}>
                {ordersTrend.startsWith('-') ? 'Giảm' : 'Tăng'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STORE COMPARISON */}
      <div className="sareport-card">
        <h3 className="sareport-card-title">So Sánh Hiệu Suất Store</h3>
        <div className="sareport-comparison-table">
          <table className="sareport-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Đơn Hàng</th>
                <th>Doanh Thu</th>
                <th>Tình Trạng</th>
              </tr>
            </thead>
            <tbody>
              {!loading && storePerformance.length === 0 && (
                <tr>
                  <td colSpan="4">Không có dữ liệu báo cáo.</td>
                </tr>
              )}
              {storePerformance.map((s) => {
                const storeData = reports.storeStats?.find(st => st.name === s.name) || {}
                return (
                  <tr key={s.name}>
                    <td><span className="sareport-store-name">{s.name}</span></td>
                    <td>{s.orders} đơn</td>
                    <td className="sareport-revenue">{formatCurrency(storeData.revenue || 0)}</td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {s.status === 'active' ? 'Hoạt Động Tốt' : 'Cần Cải Thiện'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
