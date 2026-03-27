import './SupermarketReports.css'

const storePerformance = [
  { name: 'BigMart Q1', orders: 142, revenue: '48.5M', recovered: '12.1M', nearExpiry: 5, status: 'active' },
  { name: 'BigMart Q3', orders: 118, revenue: '39.2M', recovered: '9.8M', nearExpiry: 3, status: 'active' },
  { name: 'BigMart Q5', orders: 95, revenue: '31.0M', recovered: '6.5M', nearExpiry: 8, status: 'warning' },
  { name: 'BigMart Q7', orders: 76, revenue: '24.8M', recovered: '5.2M', nearExpiry: 2, status: 'active' },
]

const monthlyData = [
  { month: 'T1', revenue: 38, recovered: 8 },
  { month: 'T2', revenue: 42, recovered: 10 },
  { month: 'T3', revenue: 45, recovered: 11 },
]

export default function SupermarketReports() {
  const totalRevenue = storePerformance.reduce((sum, s) => sum + parseFloat(s.revenue), 0)
  const totalRecovered = storePerformance.reduce((sum, s) => sum + parseFloat(s.recovered), 0)
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue))

  return (
    <div className="sareport-page">
      {/* TOOLBAR */}
      <div className="sareport-toolbar">
        <div className="sareport-toolbar-info">Báo cáo toàn chuỗi siêu thị</div>
      </div>

      {/* SUMMARY STATS */}
      <div className="sareport-stats">
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">{(totalRevenue).toFixed(1)}M</div>
          <div className="sareport-stat-label">Tổng Doanh Thu</div>
        </div>
        <div className="sareport-stat-card sareport-stat-success">
          <div className="sareport-stat-value">{(totalRecovered).toFixed(1)}M</div>
          <div className="sareport-stat-label">Thu Hồi Quyên Góp</div>
        </div>
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">18</div>
          <div className="sareport-stat-label">Sản Phẩm Sắp Hết Hạn</div>
        </div>
        <div className="sareport-stat-card">
          <div className="sareport-stat-value">5</div>
          <div className="sareport-stat-label">Tổng Store</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="sareport-charts-grid">
        {/* Revenue Chart */}
        <div className="sareport-card">
          <h3 className="sareport-card-title">Doanh Thu Hàng Tháng</h3>
          <div className="sareport-chart-area">
            {monthlyData.map((d) => (
              <div key={d.month} className="sareport-chart-col">
                <div className="sareport-chart-bar-group">
                  <div className="sareport-chart-bar" style={{ height: `${(d.revenue / maxRevenue) * 100}%` }} title={`Doanh thu: ${d.revenue}M`} />
                  <div className="sareport-chart-bar-recovered" style={{ height: `${(d.recovered / maxRevenue) * 100}%` }} title={`Thu hồi: ${d.recovered}M`} />
                </div>
                <span className="sareport-chart-label">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="sareport-chart-legend">
            <span className="sareport-legend-item"><span className="sareport-legend-dot sareport-legend-revenue" />Doanh thu</span>
            <span className="sareport-legend-item"><span className="sareport-legend-dot sareport-legend-recovered" />Thu hồi</span>
          </div>
        </div>

        {/* Near Expiry Tracking */}
        <div className="sareport-card">
          <h3 className="sareport-card-title">Theo Dõi Near-Expiry / Expired</h3>
          <div className="sareport-track-list">
            {storePerformance.map((s) => (
              <div key={s.name} className="sareport-track-item">
                <div className="sareport-track-info">
                  <span className="sareport-track-name">{s.name}</span>
                  <span className="sareport-track-detail">{s.nearExpiry} sản phẩm sắp hết hạn</span>
                </div>
                <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                  {s.nearExpiry <= 3 ? 'Tốt' : 'Cảnh Báo'}
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
                <th>Doanh Thu</th>
                <th>Thu Hồi</th>
                <th>Tình Trạng</th>
              </tr>
            </thead>
            <tbody>
              {storePerformance.map((s) => (
                <tr key={s.name}>
                  <td><span className="sareport-store-name">{s.name}</span></td>
                  <td>{s.orders} đơn</td>
                  <td className="sareport-revenue">{s.revenue} VNĐ</td>
                  <td className="sareport-recovered">{s.recovered} VNĐ</td>
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
