import { useEffect, useMemo, useState } from 'react'
import { fetchSupermarketAuditLogs } from '../../services/supermarketAdminApi'
import './AuditLog.css'

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'create', label: 'Tạo mới' },
  { value: 'update', label: 'Cập nhật' },
  { value: 'delete', label: 'Xóa' },
  { value: 'lock', label: 'Khóa' },
  { value: 'unlock', label: 'Mở khóa' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả đối tượng' },
  { value: 'store', label: 'Cửa hàng' },
  { value: 'user', label: 'Nhân viên' },
  { value: 'product', label: 'Sản phẩm' },
  { value: 'policy', label: 'Chính sách' },
  { value: 'coupon', label: 'Mã giảm giá' },
  { value: 'donation', label: 'Quyên góp' },
]

const TYPE_CONFIG = {
  policy: { label: 'Chính sách', badge: 'badge-info' },
  price:  { label: 'Giá',        badge: 'badge-warning' },
  donation: { label: 'Quyên góp', badge: 'badge-success' },
  staff:  { label: 'Nhân viên',  badge: 'badge-muted' },
}

function prettyJson(value) {
  if (!value) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function detectType(action) {
  const a = (action || '').toLowerCase()
  if (a.includes('policy')) return 'policy'
  if (a.includes('price'))  return 'price'
  if (a.includes('donat') || a.includes('charity') || a.includes('quyen')) return 'donation'
  return 'staff'
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    fromDate: '',
    toDate: '',
  })

  const filterParams = useMemo(
    () => ({
      action: filters.action || undefined,
      entity_type: filters.entityType || undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
      limit: 300,
    }),
    [filters],
  )

  useEffect(() => {
    let active = true

    async function loadLogs() {
      try {
        setError('')
        const items = await fetchSupermarketAuditLogs(filterParams)
        if (!active) return

        const mapped = items.map((item) => {
          const action = item.action || '-'
          const type = detectType(action)
          return {
            id: item.id,
            time: item.time || '-',
            actor: item.actor || 'System',
            action,
            detail: item.newValue || item.oldValue || '-',
            type,
            entityType: item.entityType || '-',
            entityId: item.entityId ?? null,
            oldValue: item.oldValue,
            newValue: item.newValue,
          }
        })
        setLogs(mapped)
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.detail || 'Không thể tải dữ liệu audit log.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLogs()
    return () => { active = false }
  }, [filterParams])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setLoading(true)
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  function clearFilters() {
    setLoading(true)
    setFilters({ action: '', entityType: '', fromDate: '', toDate: '' })
  }

  return (
    <div className="saaudit-page">
      {/* FILTERS */}
      <section className="saaudit-filters">
        <div className="saaudit-filter-item">
          <label>Hành Động</label>
          <select name="action" value={filters.action} onChange={handleFilterChange}>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="saaudit-filter-item">
          <label>Đối Tượng</label>
          <select name="entityType" value={filters.entityType} onChange={handleFilterChange}>
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="saaudit-filter-item">
          <label>Từ Ngày</label>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="saaudit-filter-item">
          <label>Đến Ngày</label>
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="saaudit-filter-item saaudit-filter-actions">
          <label className="ghost-label">Thao Tác</label>
          <button type="button" className="btn-clear" onClick={clearFilters}>
            Xóa lọc
          </button>
        </div>
      </section>

      {/* TABLE CARD */}
      <section className="saaudit-card">
        <div className="saaudit-toolbar">
          {loading && <span>Đang tải...</span>}
          {!loading && <span>Hiển thị {logs.length} log</span>}
        </div>

        {error && <div className="saaudit-error">{error}</div>}

        <div className="saaudit-table-wrap">
          <table className="saaudit-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Nhân Viên</th>
                <th>Hành Động</th>
                <th>Đối Tượng</th>
                <th>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan="5" className="saaudit-empty-row">
                    Chưa có dữ liệu audit log
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const typeInfo = TYPE_CONFIG[log.type] || TYPE_CONFIG.staff
                return (
                  <tr key={log.id}>
                    <td className="saaudit-time">{log.time}</td>
                    <td><span className="saaudit-staff">{log.actor}</span></td>
                    <td className="saaudit-action">{log.action}</td>
                    <td className="saaudit-entity">{log.entityType}</td>
                    <td className="saaudit-detail-cell">
                      <div className="saaudit-detail-text">{log.detail}</div>
                      <button
                        type="button"
                        className="btn-view"
                        onClick={() => setSelectedLog(log)}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL */}
      {selectedLog && (
        <div className="saaudit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="saaudit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="saaudit-modal-header">
              <h3>Chi tiết Audit Log #{selectedLog.id}</h3>
              <button type="button" onClick={() => setSelectedLog(null)}>X</button>
            </div>
            <div className="saaudit-modal-content">
              <div className="kv">
                <span>Thời gian</span>
                <strong>{selectedLog.time}</strong>
              </div>
              <div className="kv">
                <span>Người thực hiện</span>
                <strong>{selectedLog.actor}</strong>
              </div>
              <div className="kv">
                <span>Hành động</span>
                <strong>{selectedLog.action}</strong>
              </div>
              <div className="kv">
                <span>Đối tượng</span>
                <strong>{selectedLog.entityType}{selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}</strong>
              </div>
              <div className="kv">
                <span>Loại</span>
                <strong>
                  <span className={`badge ${TYPE_CONFIG[selectedLog.type]?.badge || 'badge-muted'}`}>
                    {TYPE_CONFIG[selectedLog.type]?.label || 'Nhân viên'}
                  </span>
                </strong>
              </div>
              <div className="json-box">
                <h4>Giá trị cũ</h4>
                <pre>{prettyJson(selectedLog.oldValue)}</pre>
              </div>
              <div className="json-box">
                <h4>Giá trị mới</h4>
                <pre>{prettyJson(selectedLog.newValue)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
