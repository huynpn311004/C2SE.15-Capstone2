import { useEffect, useState } from 'react'
import { fetchSupermarketStaff } from '../../services/supermarketAdminApi'
import './PermissionsManagement.css'

const ALL_PERMISSIONS = [
  { key: 'inventory.view', label: 'Xem tồn kho' },
  { key: 'inventory.edit', label: 'Chỉnh sửa tồn kho' },
  { key: 'inventory.delete', label: 'Xóa tồn kho' },
  { key: 'orders.view', label: 'Xem đơn hàng' },
  { key: 'orders.update', label: 'Cập nhật đơn hàng' },
  { key: 'donations.view', label: 'Xem donation' },
  { key: 'donations.approve', label: 'Duyệt donation' },
  { key: 'reports.view', label: 'Xem báo cáo' },
]

export default function PermissionsManagement() {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [formPerms, setFormPerms] = useState([])

  useEffect(() => {
    let active = true

    async function loadPermissions() {
      try {
        const staff = await fetchSupermarketStaff()
        if (!active) return
        const mapped = staff.map((item) => {
          const role = (item.role || '').toLowerCase()
          let permissions = ['inventory.view', 'orders.view']
          if (role.includes('store staff')) {
            permissions = ['inventory.view', 'inventory.edit', 'orders.view', 'orders.update']
          }
          if (role.includes('supermarket admin')) {
            permissions = ALL_PERMISSIONS.map((perm) => perm.key)
          }

          return {
            id: item.id,
            staffName: item.fullName,
            role: item.role,
            permissions,
            store: item.supermarket || '-',
          }
        })
        setData(mapped)
      } catch {
        if (!active) return
        setData([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPermissions()
    return () => {
      active = false
    }
  }, [])

  function openModal(item) {
    setSelected(item)
    setFormPerms([...item.permissions])
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelected(null)
    setError('')
    setSuccess('')
  }

  function togglePerm(key) {
    setFormPerms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
    setError('')
    setSuccess('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (formPerms.length === 0) { setError('Phải chọn ít nhất 1 quyền.'); return }
    setData(prev => prev.map(d => d.id === selected.id ? { ...d, permissions: formPerms } : d))
    setSuccess('Đã cập nhật phân quyền.')
  }

  return (
    <div className="saperm-page">
      {/* TOOLBAR */}
      <div className="saperm-toolbar">
        <div className="saperm-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${data.length} nhân viên`}</div>
      </div>

      {/* TABLE */}
      <div className="saperm-card">
        <div className="table-responsive">
          <table className="saperm-table">
            <thead>
              <tr>
                <th>Nhân Viên</th>
                <th>Store</th>
                <th>Chức Vụ</th>
                <th>Quyền</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan="5">Không có dữ liệu phân quyền.</td>
                </tr>
              )}
              {data.map(item => (
                <tr key={item.id}>
                  <td><span className="saperm-name">{item.staffName}</span></td>
                  <td>{item.store}</td>
                  <td>{item.role}</td>
                  <td>
                    <div className="saperm-perm-tags">
                      {item.permissions.map(p => {
                        const def = ALL_PERMISSIONS.find(d => d.key === p)
                        return (
                          <span key={p} className="saperm-perm-tag">{def ? def.label : p}</span>
                        )
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="action-group">
                      <button onClick={() => openModal(item)} className="action-btn icon-action-btn btn-edit" title="Phân quyền">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zM10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && selected && (
        <div className="saperm-modal-overlay" onClick={closeModal}>
          <div className="saperm-modal" onClick={e => e.stopPropagation()}>
            <div className="saperm-modal-header">
              <h3>Phân Quyền — {selected.staffName}</h3>
              <button className="saperm-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="saperm-modal-body" onSubmit={handleSubmit}>
              <p className="saperm-modal-subtitle">Chọn các quyền cho nhân viên này tại store {selected.store}:</p>
              <div className="saperm-perm-grid">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm.key} className={`saperm-perm-check ${formPerms.includes(perm.key) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formPerms.includes(perm.key)}
                      onChange={() => togglePerm(perm.key)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
              {error && <p className="saperm-error">{error}</p>}
              {success && <p className="saperm-success">{success}</p>}
              <div className="saperm-form-footer">
                <div className="saperm-form-actions">
                  <button type="submit" className="btn-large saperm-btn-save">Lưu Phân Quyền</button>
                  <button type="button" className="btn-large btn-close" onClick={closeModal}>Hủy</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
