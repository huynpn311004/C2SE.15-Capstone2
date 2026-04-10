import { useEffect, useMemo, useState } from 'react'
import { fetchSupermarketReports } from '../../services/supermarketAdminApi'
import './SupermarketReports.css'

function metricToNumber(rawValue) {
  return Number((rawValue || '0').toString().replace(/[^\d.-]/g, '')) || 0
}

export default function SupermarketReports() {
  const [reports, setReports] = useState({ metrics: {}, supermarketTop: [] })
  const [reportSeries, setReportSeries] = useState({
    '7d': { metrics: {} },
    '30d': { metrics: {} },
    '90d': { metrics: {} },
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
        setReports(data30d || { metrics: {}, supermarketTop: [] })
        setReportSeries({
          '7d': data7d || { metrics: {} },
          '30d': data30d || { metrics: {} },
          '90d': data90d || { metrics: {} },
        })
      } catch {
        if (!active) return
        setReports({ metrics: {}, supermarketTop: [] })
        setReportSeries({
          '7d': { metrics: {} },
          '30d': { metrics: {} },
          '90d': { metrics: {} },
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
    () => (reports.supermarketTop || []).map((item) => {
      const orders = Number(item.orders || 0)
      return {
        name: item.name,
        orders,
        growth: item.growth || 'N/A',
        status: orders > 0 ? 'active' : 'warning',
      }
    }),
    [reports.supermarketTop],
  )

  const periodData = useMemo(
    () => [
      {
        label: '7 ngày',
        revenue: metricToNumber(reportSeries['7d']?.metrics?.revenue),
        orders: metricToNumber(reportSeries['7d']?.metrics?.orders),
      },
      {
        label: '30 ngày',
        revenue: metricToNumber(reportSeries['30d']?.metrics?.revenue),
        orders: metricToNumber(reportSeries['30d']?.metrics?.orders),
      },
      {
        label: '90 ngày',
        revenue: metricToNumber(reportSeries['90d']?.metrics?.revenue),
        orders: metricToNumber(reportSeries['90d']?.metrics?.orders),
      },
    ],
    [reportSeries],
  )

  const maxRevenue = Math.max(1, ...periodData.map((d) => d.revenue))
  const maxOrders = Math.max(1, ...periodData.map((d) => d.orders))
  const currentRevenue = reports.metrics?.revenue || '0 VND'
  const currentOrders = reports.metrics?.orders || '0'
  const deliveredRate = reports.metrics?.deliveredRate || '0%'
  const activePartners = reports.metrics?.activePartners || '0'
  const revenueTrend = reports.metrics?.revenueTrend || '0%'
  const ordersTrend = reports.metrics?.ordersTrend || '0%'

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
          <div className="sareport-stat-value">{deliveredRate}</div>
          <div className="sareport-stat-label">Tỷ Lệ Giao Thành Công</div>
        </div>
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">{activePartners}</div>
          <div className="sareport-stat-label">Đối Tác Hoạt Động</div>
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
                  <div className="sareport-chart-bar" style={{ height: `${(d.revenue / maxRevenue) * 100}%` }} title={`Doanh thu: ${d.revenue}`} />
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
            {!loading && (reports.deliveryTop || []).length === 0 && <div>Chưa có dữ liệu đối tác giao hàng.</div>}
            {(reports.deliveryTop || []).map((item) => (
              <div key={item.name} className="sareport-track-item">
                <div className="sareport-track-info">
                  <span className="sareport-track-name">{item.name}</span>
                  <span className="sareport-track-detail">Tỷ lệ hoàn thành: {item.completion} | TG TB: {item.avgTime}</span>
                </div>
                <span className="badge badge-success">
                  Hoạt động
                </span>
              </div>
            ))}
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
                <th>Tăng Trưởng</th>
                <th>Tình Trạng</th>
              </tr>
            </thead>
            <tbody>
              {!loading && storePerformance.length === 0 && (
                <tr>
                  <td colSpan="4">Không có dữ liệu báo cáo.</td>
                </tr>
              )}
              {storePerformance.map((s) => (
                <tr key={s.name}>
                  <td><span className="sareport-store-name">{s.name}</span></td>
                  <td>{s.orders} đơn</td>
                  <td className="sareport-revenue">{s.growth}</td>
                  <td>
                    <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {s.status === 'active' ? 'Hoạt Động Tốt' : 'Cần Cải Thiện'}
                    </span>
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
