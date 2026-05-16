import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { fetchAdminDashboardSummary, fetchAdminReports } from '../../services/adminApi'
import './SystemAdminDashboard.css'

export default function SystemAdminDashboard() {
  const [summary, setSummary] = useState({
    supermarkets: 0,
    charities: 0,
    deliveries: 0,
    users: 0,
  })
  const [reports, setReports] = useState({
    metrics: {
      revenue: '0 VND',
      orders: '0',
      deliveredRate: '0%',
      activePartners: '0',
      shippingProfit: '0 VND'
    }
  })
  const [showProfit, setShowProfit] = useState(true)

  useEffect(() => {
    let active = true

    async function loadData() {
      // Load Summary independently
      try {
        const summaryData = await fetchAdminDashboardSummary()
        if (active) setSummary(summaryData)
      } catch (err) {
        console.error('Failed to load dashboard summary:', err)
      }

      // Load Reports independently
      try {
        const reportsData = await fetchAdminReports('30d')
        if (active) setReports(reportsData)
      } catch (err) {
        console.error('Failed to load dashboard reports:', err)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  const stats = [
    {
      label: 'Siêu thị',
      value: summary.supermarkets || 0,
      color: 'teal',
    },
    {
      label: 'Tổ chức từ thiện',
      value: summary.charities || 0,
      color: 'red',
    },
    {
      label: 'Đối tác Giao hàng',
      value: summary.deliveries || 0,
      color: 'orange',
    },
    {
      label: 'Lợi nhuận Vận chuyển',
      value: reports.metrics.shippingProfit || '0 VND',
      color: 'green',
      isMoney: true,
    },
    {
      label: 'Người dùng',
      value: summary.users || 0,
      color: 'blue',
    },
  ]

  return (
    <SystemAdminLayout>
      <div className="dashboard-page">
        {/* STATS GRID */}
        <div className="dashboard-stats">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`stat-card stat-card-${stat.color}`}
            >
              <div className="stat-value-container">
                <div className="stat-value">
                  {stat.isMoney ? (showProfit ? stat.value : '********') : stat.value}
                </div>
                {stat.isMoney && (
                  <button 
                    className="eye-toggle-btn" 
                    onClick={() => setShowProfit(!showProfit)}
                    title={showProfit ? "Ẩn số tiền" : "Hiện số tiền"}
                  >
                    {showProfit ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

      </div>
    </SystemAdminLayout>
  )
}
