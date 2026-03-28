import { useEffect, useMemo, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { fetchAdminAuditLogs } from '../../services/adminApi'
import './AdminAuditLog.css'

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
  { value: 'users', label: 'Người dùng' },
  { value: 'supermarkets', label: 'Siêu thị' },
  { value: 'charity_organizations', label: 'Charity' },
  { value: 'delivery_partners', label: 'Đối tác giao hàng' },
  { value: 'orders', label: 'Đơn hàng' },
]

function prettyJson(value) {
  if (!value) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    userKeyword: '',
    fromDate: '',
    toDate: '',
  })

  const filterParams = useMemo(
    () => ({
      action: filters.action || undefined,
      entity_type: filters.entityType || undefined,
      user_keyword: filters.userKeyword || undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
      limit: 300,
    }),
    [filters],
  )

  useEffect(() => {
    let active = true

    async function loadAuditLogs() {
      try {
        setError('')
        const items = await fetchAdminAuditLogs(filterParams)
        if (!active) return
        setLogs(items)
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.detail || 'Không thể tải dữ liệu audit log.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAuditLogs()

    return () => {
      active = false
    }
  }, [filterParams])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setLoading(true)
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function clearFilters() {
    setLoading(true)
    setFilters({
      action: '',
      entityType: '',
      userKeyword: '',
      fromDate: '',
      toDate: '',
    })
  }

  return (
    <SystemAdminLayout>
      <div className="admin-audit-page">
        <section className="admin-audit-filters">
          <div className="admin-audit-filter-item">
            <label>Hành Động</label>
            <select name="action" value={filters.action} onChange={handleFilterChange}>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-audit-filter-item">
            <label>Đối Tượng</label>
            <select name="entityType" value={filters.entityType} onChange={handleFilterChange}>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-audit-filter-item">
            <label>Người Thực Hiện</label>
            <input
              name="userKeyword"
              value={filters.userKeyword}
              onChange={handleFilterChange}
              placeholder="Nhập tên/email"
            />
          </div>

          <div className="admin-audit-filter-item">
            <label>Từ Ngày</label>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
          </div>

          <div className="admin-audit-filter-item">
            <label>Đến Ngày</label>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
          </div>

          <div className="admin-audit-filter-item admin-audit-filter-actions">
            <label className="ghost-label">Thao Tác</label>
            <button type="button" className="btn-clear" onClick={clearFilters}>
              Xóa lọc
            </button>
          </div>
        </section>

        <section className="admin-audit-card">
          <div className="admin-audit-toolbar">
            <div>Hiển thị {logs.length} log</div>
          </div>

          {loading && <div className="admin-audit-empty">Đang tải dữ liệu...</div>}
          {error && <div className="admin-audit-empty">{error}</div>}

          <div className="admin-audit-table-wrap">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th>Thời Gian</th>
                  <th>Người Thực Hiện</th>
                  <th>Hành Động</th>
                  <th>Đối Tượng</th>
                  <th>ID Đối Tượng</th>
                  <th>Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.time}</td>
                      <td>{log.actor}</td>
                      <td>{log.action}</td>
                      <td>{log.entityType}</td>
                      <td>{log.entityId ?? '-'}</td>
                      <td>
                        <button className="btn-view" type="button" onClick={() => setSelectedLog(log)}>
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  !loading && (
                    <tr>
                      <td colSpan={6} className="admin-audit-empty-row">
                        Chưa có dữ liệu audit log
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedLog && (
          <div className="admin-audit-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="admin-audit-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-audit-modal-header">
                <h3>Chi tiết Audit Log #{selectedLog.id}</h3>
                <button type="button" onClick={() => setSelectedLog(null)}>
                  X
                </button>
              </div>

              <div className="admin-audit-modal-content">
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
                  <strong>
                    {selectedLog.entityType} #{selectedLog.entityId ?? '-'}
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
    </SystemAdminLayout>
  )
}
