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
  const [summaryData, setSummaryData] = useState(null)
  const [recentRequests, setRecentRequests] = useState([])
  const [orgName, setOrgName] = useState('Tổ Chức Từ Thiện')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('received')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const [summaryResult, requestsData] = await Promise.all([
        fetchCharityDashboardSummary(),
        fetchCharityDonationRequests(),
      ])

      setSummaryData(summaryResult)
      setOrgName(summaryResult.orgName || 'Tổ Chức Từ Thiện')

      setStats([
        {
          label: 'Đơn Đã Nhận',
          value: summaryResult.totalReceived || 0,
          sub: `${summaryResult.totalProducts || 0} sản phẩm`,
          tone: 'success',
        },
        {
          label: 'Đơn Đang Chờ',
          value: summaryResult.totalPending || 0,
          sub: summaryResult.totalApproved > 0 ? `${summaryResult.totalApproved} đã duyệt` : 'chưa có duyệt',
          tone: summaryResult.totalPending > 0 ? 'warning' : 'success',
        },
        {
          label: 'Siêu Thị Đã Quyên Góp',
          value: summaryResult.uniqueStores || 0,
          sub: 'siêu thị',
          tone: 'success',
        },
        {
          label: 'Yêu Cầu Đã Duyệt',
          value: summaryResult.totalApproved || 0,
          sub: 'chờ nhận',
          tone: summaryResult.totalApproved > 0 ? 'info' : 'success',
        },
      ])

      setRecentRequests(requestsData || [])
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể tải dữ liệu dashboard')
      setStats([
        { label: 'Đơn Đã Nhận', value: 0, sub: '', tone: 'success' },
        { label: 'Đơn Đang Chờ', value: 0, sub: '', tone: 'warning' },
        { label: 'Siêu Thị Đã Quyên Góp', value: 0, sub: '', tone: 'success' },
        { label: 'Yêu Cầu Đã Duyệt', value: 0, sub: '', tone: 'info' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const receivedList = summaryData?.receivedList || []
  const pendingList = summaryData?.pendingList || []

  return (
    <CharityLayout>
      <div className="chdash-page">
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

        {!loading && !error && (
          <>
            {/* STATS */}
            <div className="chdash-stats">
              {stats.map((stat, idx) => (
                <div key={idx} className={`chdash-stat-card ${stat.tone === 'warning' ? 'chdash-stat-warning' : ''}`}>
                  <div className="chdash-stat-value">{stat.value}</div>
                  <div className="chdash-stat-label">{stat.label}</div>
                  <div className="chdash-stat-sub">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div className="chdash-tabs">
              <button
                className={`chdash-tab ${activeTab === 'received' ? 'active' : ''}`}
                onClick={() => setActiveTab('received')}
              >
                Đã Nhận ({receivedList.length})
              </button>
              <button
                className={`chdash-tab ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Đang Chờ ({pendingList.length})
              </button>
              <button
                className={`chdash-tab ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                Thống Kê
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="chdash-content-grid">
              {/* Received tab */}
              {activeTab === 'received' && (
                <div className="chdash-card chdash-full-card">
                  <h3 className="chdash-card-title">Danh Sách Đã Nhận</h3>
                  {receivedList.length === 0 ? (
                    <div className="chdash-empty">Chưa có đơn nào được nhận.</div>
                  ) : (
                    <div className="chdash-request-list">
                      {receivedList.map((item) => (
                        <div key={item.id} className="chdash-request-item">
                          <div className="chdash-request-info">
                            <span className="chdash-request-id">#{item.id}</span>
                            <span className="chdash-request-name">{item.product}</span>
                            <span className="chdash-request-store">{item.store}</span>
                          </div>
                          <div className="chdash-request-meta">
                            <span className="badge badge-success">{statusLabel.received}</span>
                            <span className="chdash-request-date">{item.qty} sản phẩm</span>
                            <span className="chdash-request-date">{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pending tab */}
              {activeTab === 'pending' && (
                <div className="chdash-card chdash-full-card">
                  <h3 className="chdash-card-title">Yêu Cầu Đang Chờ Duyệt</h3>
                  {pendingList.length === 0 ? (
                    <div className="chdash-empty">Không có yêu cầu nào đang chờ.</div>
                  ) : (
                    <div className="chdash-request-list">
                      {pendingList.map((item) => (
                        <div key={item.id} className="chdash-request-item">
                          <div className="chdash-request-info">
                            <span className="chdash-request-id">#{item.id}</span>
                            <span className="chdash-request-name">{item.product}</span>
                            <span className="chdash-request-store">{item.store}</span>
                          </div>
                          <div className="chdash-request-meta">
                            <span className="badge badge-warning">{statusLabel.pending}</span>
                            <span className="chdash-request-date">{item.qty} sản phẩm</span>
                            <span className="chdash-request-date">{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats tab */}
              {activeTab === 'stats' && (
                <>
                  <div className="chdash-card">
                    <h3 className="chdash-card-title">Tóm Tắt Hoạt Động</h3>
                    <div className="chdash-activity-list">
                      <div className="chdash-activity-item">
                        <span className="chdash-activity-dot chdash-dot-success" />
                        <span className="chdash-activity-text">
                          Đơn đã nhận: <strong>{summaryData?.totalReceived || 0}</strong>
                        </span>
                      </div>
                      <div className="chdash-activity-item">
                        <span className="chdash-activity-dot chdash-dot-warning" />
                        <span className="chdash-activity-text">
                          Đơn đang chờ: <strong>{summaryData?.totalPending || 0}</strong>
                        </span>
                      </div>
                      <div className="chdash-activity-item">
                        <span className="chdash-activity-dot chdash-dot-info" />
                        <span className="chdash-activity-text">
                          Đơn đã duyệt: <strong>{summaryData?.totalApproved || 0}</strong>
                        </span>
                      </div>
                      <div className="chdash-activity-item">
                        <span className="chdash-activity-dot chdash-dot-success" />
                        <span className="chdash-activity-text">
                          Tổng sản phẩm đã nhận: <strong>{summaryData?.totalProducts || 0}</strong>
                        </span>
                      </div>
                      <div className="chdash-activity-item">
                        <span className="chdash-activity-dot chdash-dot-teal" />
                        <span className="chdash-activity-text">
                          Siêu thị đã quyên góp: <strong>{summaryData?.uniqueStores || 0}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="chdash-card">
                    <h3 className="chdash-card-title">Tất Cả Yêu Cầu Gần Đây</h3>
                    {recentRequests.length === 0 ? (
                      <div className="chdash-empty">Chưa có yêu cầu nào.</div>
                    ) : (
                      <div className="chdash-request-list">
                        {recentRequests.slice(0, 15).map((req) => (
                          <div key={req.id} className="chdash-request-item">
                            <div className="chdash-request-info">
                              <span className="chdash-request-id">{req.id}</span>
                              <span className="chdash-request-name">{req.item}</span>
                              <span className="chdash-request-store">{req.store} - {req.reqQty} sản phẩm</span>
                            </div>
                            <div className="chdash-request-meta">
                              <span className={`badge ${statusBadge[req.status]}`}>
                                {statusLabel[req.status]}
                              </span>
                              <span className="chdash-request-date">{req.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </CharityLayout>
  )
}
