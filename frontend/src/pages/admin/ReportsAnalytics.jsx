import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { fetchAdminReports } from '../../services/adminApi'
import './ReportsAnalytics.css'

export default function ReportsAnalytics() {
  const [range, setRange] = useState('30d')
  const [metrics, setMetrics] = useState({
    revenue: '0 VND',
    orders: '0',
    deliveredRate: '0%',
    activePartners: '0',
    revenueTrend: '0%',
    ordersTrend: '0%',
  })
  const [supermarketTop, setSupermarketTop] = useState([])
  const [deliveryTop, setDeliveryTop] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadReports() {
      try {
        setError('')
        const data = await fetchAdminReports(range)
        if (!active) return
        setMetrics(data.metrics || {})
        setSupermarketTop(data.supermarketTop || [])
        setDeliveryTop(data.deliveryTop || [])
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.detail || 'Không thể tải báo cáo từ hệ thống.')
      }
    }

    loadReports()

    return () => {
      active = false
    }
  }, [range])

  return (
    <SystemAdminLayout>
      <div className="reports-page">
        <section className="reports-filters">
          <div className="reports-filter-group">
            <label htmlFor="reports-range-select">Khoảng Thời Gian</label>
            <select
              id="reports-range-select"
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="reports-filter-select"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="90d">90 ngày</option>
            </select>
          </div>
        </section>

        <section className="reports-metrics">
          <article className="report-card">
            <span className="report-label">Tổng Doanh Thu</span>
            <strong className="report-value">{metrics.revenue}</strong>
            <span className="report-trend positive">{metrics.revenueTrend || '0%'} so với kỳ trước</span>
          </article>
          <article className="report-card">
            <span className="report-label">Đơn Hàng Hoàn Tất</span>
            <strong className="report-value">{metrics.orders}</strong>
            <span className="report-trend positive">{metrics.ordersTrend || '0%'} so với kỳ trước</span>
          </article>
          <article className="report-card">
            <span className="report-label">Tỷ Lệ Giao Thành Công</span>
            <strong className="report-value">{metrics.deliveredRate}</strong>
            <span className="report-trend neutral">Theo dữ liệu thực tế</span>
          </article>
          <article className="report-card">
            <span className="report-label">Đối Tác Hoạt Động</span>
            <strong className="report-value">{metrics.activePartners}</strong>
            <span className="report-trend neutral">Theo dữ liệu thực tế</span>
          </article>
        </section>

        {error && <div className="reports-panel">{error}</div>}

        <section className="reports-grid">
          <article className="reports-panel">
            <h3>Top Siêu Thị Theo Đơn Hàng</h3>
            <div className="report-table">
              <div className="report-table-head">
                <span>Supermarket</span>
                <span>Đơn Hàng</span>
                <span>Tăng Trưởng</span>
              </div>
              {supermarketTop.length > 0 ? (
                supermarketTop.map((item) => (
                  <div className="report-table-row" key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.orders.toLocaleString('vi-VN')}</span>
                    <span className="positive">{item.growth}</span>
                  </div>
                ))
              ) : (
                <div className="report-table-row">
                  <span>Chưa có dữ liệu</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              )}
            </div>
          </article>

          <article className="reports-panel">
            <h3>Hiệu Suất Đối Tác Giao Hàng</h3>
            <div className="report-table">
              <div className="report-table-head">
                <span>Đối Tác</span>
                <span>Hoàn Tất</span>
                <span>Thời Gian TB</span>
              </div>
              {deliveryTop.length > 0 ? (
                deliveryTop.map((item) => (
                  <div className="report-table-row" key={item.name}>
                    <span>{item.name}</span>
                    <span className="positive">{item.completion}</span>
                    <span>{item.avgTime}</span>
                  </div>
                ))
              ) : (
                <div className="report-table-row">
                  <span>Chưa có dữ liệu</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </SystemAdminLayout>
  )
}
