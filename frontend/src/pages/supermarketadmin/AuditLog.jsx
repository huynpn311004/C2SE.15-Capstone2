import { useEffect, useState } from 'react'
import { fetchSupermarketAuditLogs } from '../../services/supermarketAdminApi'
import './AuditLog.css'

const typeIcon = {
  policy: '⚙️',
  price: '💰',
  donation: '🎁',
  staff: '👤',
}

const typeBadge = {
  policy: 'badge-info',
  price: 'badge-warning',
  donation: 'badge-success',
  staff: 'badge-muted',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadLogs() {
      try {
        const items = await fetchSupermarketAuditLogs(200)
        if (!active) return
        const mapped = items.map((item) => {
          const action = item.action || '-'
          const actionLower = action.toLowerCase()
          let type = 'staff'
          if (actionLower.includes('policy')) type = 'policy'
          if (actionLower.includes('price')) type = 'price'
          if (actionLower.includes('donat') || actionLower.includes('charity')) type = 'donation'
          return {
            id: item.id,
            time: item.time,
            staff: item.actor,
            action,
            detail: item.newValue || item.oldValue || '-',
            type,
          }
        })
        setLogs(mapped)
      } catch {
        if (!active) return
        setLogs([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLogs()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="saaudit-page">
      {/* TOOLBAR */}
      <div className="saaudit-toolbar">
        <div className="saaudit-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${logs.length} log`}</div>
      </div>

      {/* TABLE */}
      <div className="saaudit-card">
        <div className="table-responsive">
          <table className="saaudit-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Nhân Viên</th>
                <th>Hành Động</th>
                <th>Chi Tiết</th>
                <th>Loại</th>
              </tr>
            </thead>
            <tbody>
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan="5">Không có audit log.</td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="saaudit-time">{log.time}</td>
                  <td><span className="saaudit-staff">{log.staff}</span></td>
                  <td className="saaudit-action">{log.action}</td>
                  <td className="saaudit-detail">{log.detail}</td>
                  <td>
                    <div className="saaudit-type-cell">
                      <span className={`badge ${typeBadge[log.type] || 'badge-muted'}`}>{typeIcon[log.type] || '👤'} {log.type === 'policy' ? 'Chính Sách' : log.type === 'price' ? 'Giá' : log.type === 'donation' ? 'Donation' : 'Staff'}</span>
                    </div>
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
