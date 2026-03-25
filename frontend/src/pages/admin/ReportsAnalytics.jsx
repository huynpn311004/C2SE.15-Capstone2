import { useMemo, useState } from 'react'
import SystemAdminLayout from '../../components/layout/Layout'
import './ReportsAnalytics.css'

export default function ReportsAnalytics() {
  const [range, setRange] = useState('30d')

  const metrics = useMemo(() => {
    const map = {
      '7d': {
        revenue: '1.28B VND',
        orders: '9,420',
        deliveredRate: '96.8%',
        activePartners: '48',
      },
      '30d': {
        revenue: '5.46B VND',
        orders: '41,775',
        deliveredRate: '97.4%',
        activePartners: '63',
      },
      '90d': {
        revenue: '15.94B VND',
        orders: '122,100',
        deliveredRate: '97.1%',
        activePartners: '75',
      },
    }
    return map[range]
  }, [range])

  const supermarketTop = [
    { name: 'BigMart Central', orders: 8920, growth: '+12.5%' },
    { name: 'FreshMart Downtown', orders: 7745, growth: '+9.4%' },
    { name: 'ValueMart South', orders: 6420, growth: '+8.1%' },
    { name: 'EasyMart North', orders: 5988, growth: '+6.3%' },
  ]

  const deliveryTop = [
    { name: 'FastShip Express', completion: '98.2%', avgTime: '31 phút' },
    { name: 'GreenDelivery', completion: '97.6%', avgTime: '34 phút' },
    { name: 'CityRunner', completion: '96.9%', avgTime: '37 phút' },
  ]

  return (
    <SystemAdminLayout>
      <div className="reports-page">
        <section className="reports-hero">
          <div>
            <h2>Báo Cáo & Phân Tích</h2>
            <p>Theo dõi hiệu suất vận hành, đơn hàng và đối tác theo thời gian thực.</p>
          </div>
          <div className="reports-range">
            <label htmlFor="reports-range-select">Khoảng Thời Gian</label>
            <select
              id="reports-range-select"
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="reports-select"
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
            <span className="report-trend positive">+10.2% so với kỳ trước</span>
          </article>
          <article className="report-card">
            <span className="report-label">Đơn Hàng Hoàn Tất</span>
            <strong className="report-value">{metrics.orders}</strong>
            <span className="report-trend positive">+7.8% so với kỳ trước</span>
          </article>
          <article className="report-card">
            <span className="report-label">Tỷ Lệ Giao Thành Công</span>
            <strong className="report-value">{metrics.deliveredRate}</strong>
            <span className="report-trend positive">+1.1 điểm %</span>
          </article>
          <article className="report-card">
            <span className="report-label">Đối Tác Hoạt Động</span>
            <strong className="report-value">{metrics.activePartners}</strong>
            <span className="report-trend neutral">Ổn định</span>
          </article>
        </section>

        <section className="reports-grid">
          <article className="reports-panel">
            <h3>Phân Bố Đơn Hàng Theo Kênh</h3>
            <div className="bar-list">
              <div className="bar-row">
                <span>Đơn giao nhanh</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '74%' }} /></div>
                <strong>74%</strong>
              </div>
              <div className="bar-row">
                <span>Đơn từ thiện</span>
                <div className="bar-track"><div className="bar-fill alt" style={{ width: '16%' }} /></div>
                <strong>16%</strong>
              </div>
              <div className="bar-row">
                <span>Đơn pickup</span>
                <div className="bar-track"><div className="bar-fill warn" style={{ width: '10%' }} /></div>
                <strong>10%</strong>
              </div>
            </div>
          </article>

          <article className="reports-panel">
            <h3>Top Siêu Thị Theo Đơn Hàng</h3>
            <div className="report-table">
              <div className="report-table-head">
                <span>Supermarket</span>
                <span>Đơn hàng</span>
                <span>Tăng trưởng</span>
              </div>
              {supermarketTop.map((item) => (
                <div className="report-table-row" key={item.name}>
                  <span>{item.name}</span>
                  <span>{item.orders.toLocaleString('vi-VN')}</span>
                  <span className="positive">{item.growth}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="reports-panel">
            <h3>Hiệu Suất Đối Tác Giao Hàng</h3>
            <div className="report-table">
              <div className="report-table-head">
                <span>Đối tác</span>
                <span>Hoàn tất</span>
                <span>Thời gian TB</span>
              </div>
              {deliveryTop.map((item) => (
                <div className="report-table-row" key={item.name}>
                  <span>{item.name}</span>
                  <span className="positive">{item.completion}</span>
                  <span>{item.avgTime}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="reports-panel">
            <h3>Cảnh Báo Vận Hành</h3>
            <ul className="reports-alerts">
              <li><strong>Quận 7:</strong> Tỷ lệ trễ giao tăng 2.4% trong 24h qua.</li>
              <li><strong>Kho HN-02:</strong> Lượng đơn chờ xử lý vượt ngưỡng 480 đơn.</li>
              <li><strong>GreenDelivery:</strong> Có 3 ca khiếu nại cần xử lý trong ngày.</li>
            </ul>
          </article>
        </section>
      </div>
    </SystemAdminLayout>
  )
}
