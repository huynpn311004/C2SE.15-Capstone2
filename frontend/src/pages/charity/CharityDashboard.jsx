import { useState, useEffect } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import { fetchCharityDashboardSummary, fetchCharityDonationRequests } from '../../services/charityApi'
import './CharityDashboard.css'

const statusBadge = {
  pending: 'badge-warning',
  approved: 'badge-info',
  received: 'badge-success',
  rejected: 'badge-danger',
}

const statusLabel = {
  pending: 'Đang Chờ',
  approved: 'Đã Duyệt',
  received: 'Đã Nhận',
  rejected: 'Từ Chối',
}

export default function CharityDashboard() {
  const [stats, setStats] = useState([])
  const [recentRequests, setRecentRequests] = useState([])
  const [orgName, setOrgName] = useState('Tổ Chức Từ Thiện')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const [summaryData, requestsData] = await Promise.all([
        fetchCharityDashboardSummary(),
        fetchCharityDonationRequests(),
      ])

      setOrgName(summaryData.orgName || 'Tổ Chức Từ Thiện')

      setStats([
        {
          label: 'Đơn Đã Nhận',
          value: summaryData.totalReceived || 0,
          change: '+' + (summaryData.totalReceived > 0 ? 1 : 0),
          tone: 'success',
        },
        {
          label: 'Đơn Đang Chờ',
          value: summaryData.totalPending || 0,
          change: summaryData.totalPending > 0 ? '!' : '-',
          tone: summaryData.totalPending > 0 ? 'warning' : 'success',
        },
        {
          label: 'Tổng Sản Phẩm',
          value: summaryData.totalProducts || 0,
          change: '+' + (summaryData.totalProducts > 0 ? 1 : 0),
          tone: 'success',
        },
        {
          label: 'Siêu Thị Đã Quyên Góp',
          value: summaryData.uniqueStores || 0,
          change: '+' + (summaryData.uniqueStores > 0 ? 1 : 0),
          tone: 'success',
        },
      ])

      const recent = (requestsData || []).slice(0, 5)
      setRecentRequests(recent)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể tải dữ liệu dashboard')
      setStats([
        { label: 'Đơn Đã Nhận', value: 0, change: '-', tone: 'success' },
        { label: 'Đơn Đang Chờ', value: 0, change: '-', tone: 'warning' },
        { label: 'Tổng Sản Phẩm', value: 0, change: '-', tone: 'success' },
        { label: 'Siêu Thị Đã Quyên Góp', value: 0, change: '-', tone: 'success' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <CharityLayout>
      <div className="chdash-page">
        {/* WELCOME */}
        <div className="chdash-welcome">
          <div className="chdash-welcome-content">
            <h2>Chào Mừng, {orgName}!</h2>
            <p>Theo dõi các yêu cầu nhận donation và lịch sử hoạt động</p>
          </div>
        </div>

        {/* LOADING / ERROR */}
        {loading && (
          <div className="chdash-loading">
            <div className="spinner"></div>
            <span>Đang tải dữ liệu...</span>
          </div>
        )}

        {error && (
          <div className="chdash-error-banner">
            <p>{error}</p>
            <button onClick={loadDashboard} className="chdash-retry-btn">Thử lại</button>
          </div>
        )}

        {/* STATS */}
        {!loading && !error && (
          <div className="chdash-stats">
            {stats.map((stat, idx) => (
              <div key={idx} className={`chdash-stat-card ${stat.tone === 'warning' ? 'chdash-stat-warning' : ''}`}>
                <div className="chdash-stat-header">
                  <span className={`chdash-stat-change chdash-stat-change-${stat.tone}`}>{stat.change}</span>
                </div>
                <div className="chdash-stat-value">{stat.value}</div>
                <div className="chdash-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* CONTENT GRID */}
        {!loading && !error && (
          <div className="chdash-content-grid">
            {/* Recent Requests */}
            <div className="chdash-card">
              <h3 className="chdash-card-title">Yêu Cầu Gần Đây</h3>
              {recentRequests.length === 0 ? (
                <div className="chdash-empty">Chưa có yêu cầu nào.</div>
              ) : (
                <div className="chdash-request-list">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="chdash-request-item">
                      <div className="chdash-request-info">
                        <span className="chdash-request-id">{req.id}</span>
                        <span className="chdash-request-name">{req.item}</span>
                        <span className="chdash-request-store">{req.store} - {req.reqQty} sản phẩm</span>
                      </div>
                      <div className="chdash-request-meta">
                        <span className={`badge ${statusBadge[req.status]}`}>{statusLabel[req.status]}</span>
                        <span className="chdash-request-date">{req.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Summary */}
            <div className="chdash-card">
              <h3 className="chdash-card-title">Tóm Tắt Hoạt Động</h3>
              <div className="chdash-activity-list">
                <div className="chdash-activity-item">
                  <span className="chdash-activity-dot chdash-dot-success" />
                  <span className="chdash-activity-text">Yêu cầu đã nhận: <strong>{stats[0]?.value || 0}</strong></span>
                </div>
                <div className="chdash-activity-item">
                  <span className="chdash-activity-dot chdash-dot-warning" />
                  <span className="chdash-activity-text">Yêu cầu đang chờ: <strong>{stats[1]?.value || 0}</strong></span>
                </div>
                <div className="chdash-activity-item">
                  <span className="chdash-activity-dot chdash-dot-success" />
                  <span className="chdash-activity-text">Tổng sản phẩm đã nhận: <strong>{stats[2]?.value || 0}</strong></span>
                </div>
                <div className="chdash-activity-item">
                  <span className="chdash-activity-dot chdash-dot-info" />
                  <span className="chdash-activity-text">Siêu thị đã quyên góp: <strong>{stats[3]?.value || 0}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CharityLayout>
  )
}
