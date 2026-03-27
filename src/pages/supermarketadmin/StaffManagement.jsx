import { useState } from 'react'
import './StaffManagement.css'

const seedStaff = [
  { id: 1, name: 'Nguyễn Văn A', email: 'nvana@bigmart.vn', phone: '0901 111 222', store: 'BigMart Q1', role: 'Staff', status: 'active', joinDate: '2025-01-15' },
  { id: 2, name: 'Trần Thị B', email: 'ttb@bigmart.vn', phone: '0902 333 444', store: 'BigMart Q1', role: 'Staff', status: 'active', joinDate: '2025-02-20' },
  { id: 3, name: 'Lê Văn C', email: 'lvc@bigmart.vn', phone: '0903 555 666', store: 'BigMart Q3', role: 'Staff', status: 'warning', joinDate: '2025-03-10' },
  { id: 4, name: 'Phạm Thị D', email: 'ptd@bigmart.vn', phone: '0904 777 888', store: 'BigMart Q5', role: 'Staff', status: 'active', joinDate: '2025-04-05' },
  { id: 5, name: 'Hoàng Văn E', email: 'hve@bigmart.vn', phone: '0905 999 000', store: 'BigMart Q7', role: 'Staff', status: 'locked', joinDate: '2025-05-12' },
]

const statusBadge = { active: 'badge-success', warning: 'badge-warning', locked: 'badge-danger' }
const statusLabel = { active: 'Hoạt Động', warning: 'Cảnh Báo', locked: 'Bị Khóa' }

export default function StaffManagement() {
  const [staff, setStaff] = useState(seedStaff)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('edit')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', store: '', role: 'Staff', status: 'active' })

  function openCreateModal() {
    setMode('create')
    setForm({ name: '', email: '', phone: '', store: 'BigMart Q1', role: 'Staff', status: 'active' })
    setError('')
    setSuccess('')
    setSelectedStaff(null)
    setShowModal(true)
  }

  function openEditModal(s) {
    setMode('edit')
    setSelectedStaff(s)
    setForm({ name: s.name, email: s.email, phone: s.phone, store: s.store, role: s.role, status: s.status })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedStaff(null)
    setError('')
    setSuccess('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Họ tên không được để trống.'); return }
    if (!form.email.trim()) { setError('Email không được để trống.'); return }
    if (!form.phone.trim()) { setError('SĐT không được để trống.'); return }

    if (mode === 'create') {
      const newStaff = { id: Date.now(), ...form, joinDate: new Date().toISOString().split('T')[0] }
      setStaff(prev => [...prev, newStaff])
      setSuccess('Đã tạo nhân viên mới.')
    } else {
      setStaff(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, ...form } : s))
      setSuccess('Đã cập nhật thông tin nhân viên.')
    }
  }

  function toggleLock(s) {
    const next = s.status === 'locked' ? 'active' : 'locked'
    setStaff(prev => prev.map(st => st.id === s.id ? { ...st, status: next } : st))
  }

  function handleDelete(id) {
    if (!window.confirm('Xóa nhân viên này?')) return
    setStaff(prev => prev.filter(s => s.id !== id))
    if (selectedStaff?.id === id) closeModal()
  }

  return (
    <div className="sastaff-page">
      {/* TOOLBAR */}
      <div className="sastaff-toolbar">
        <div className="sastaff-toolbar-info">Hiển thị {staff.length} nhân viên</div>
        <button onClick={openCreateModal} className="sastaff-btn-create">+ Thêm Nhân Viên</button>
      </div>

      {/* TABLE */}
      <div className="sastaff-card">
        <div className="table-responsive">
          <table className="sastaff-table">
            <thead>
              <tr>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Điện Thoại</th>
                <th>Store</th>
                <th>Chức Vụ</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td><span className="sastaff-name">{s.name}</span></td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.store}</td>
                  <td>{s.role}</td>
                  <td><span className={`badge ${statusBadge[s.status]}`}>{statusLabel[s.status]}</span></td>
                  <td>
                    <div className="action-group">
                      <button onClick={() => openEditModal(s)} className="action-btn icon-action-btn btn-edit" title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" /></svg>
                      </button>
                      <button onClick={() => toggleLock(s)} className={`action-btn icon-action-btn ${s.status === 'locked' ? 'btn-unlock' : 'btn-lock'}`} title={s.status === 'locked' ? 'Mở khóa' : 'Khóa'}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          {s.status === 'locked'
                            ? <path d="M17 9h-1V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z" />
                            : <path d="M17 9h-7V7a4 4 0 1 1 8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z" />}
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="action-btn icon-action-btn btn-delete-small" title="Xóa">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" /></svg>
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
      {showModal && (
        <div className="sastaff-modal-overlay" onClick={closeModal}>
          <div className="sastaff-modal" onClick={e => e.stopPropagation()}>
            <div className="sastaff-modal-header">
              <h3>{mode === 'create' ? 'Thêm Nhân Viên Mới' : 'Chỉnh Sửa Nhân Viên'}</h3>
              <button className="sastaff-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="sastaff-modal-body" onSubmit={handleSubmit}>
              <div className="sastaff-form-grid">
                <div className="sastaff-form-column">
                  <div className="sastaff-form-field">
                    <label>Họ Tên</label>
                    <input name="name" value={form.name} onChange={handleChange} className="sastaff-input" placeholder="Nhập họ tên" required />
                  </div>
                  <div className="sastaff-form-field">
                    <label>Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="sastaff-input" placeholder="Nhập email" required />
                  </div>
                  <div className="sastaff-form-field">
                    <label>Điện Thoại</label>
                    <input name="phone" value={form.phone} onChange={handleChange} className="sastaff-input" placeholder="Nhập SĐT" required />
                  </div>
                </div>
                <div className="sastaff-form-column">
                  <div className="sastaff-form-field">
                    <label>Store</label>
                    <select name="store" value={form.store} onChange={handleChange} className="sastaff-input">
                      <option>BigMart Q1</option>
                      <option>BigMart Q3</option>
                      <option>BigMart Q5</option>
                      <option>BigMart Q7</option>
                    </select>
                  </div>
                  <div className="sastaff-form-field">
                    <label>Chức Vụ</label>
                    <select name="role" value={form.role} onChange={handleChange} className="sastaff-input">
                      <option>Staff</option>
                      <option>Senior Staff</option>
                      <option>Supervisor</option>
                    </select>
                  </div>
                  <div className="sastaff-form-field">
                    <label>Trạng Thái</label>
                    <select name="status" value={form.status} onChange={handleChange} className="sastaff-input">
                      <option value="active">Hoạt Động</option>
                      <option value="warning">Cảnh Báo</option>
                      <option value="locked">Bị Khóa</option>
                    </select>
                  </div>
                </div>
              </div>
              {error && <p className="sastaff-error">{error}</p>}
              {success && <p className="sastaff-success">{success}</p>}
              <div className="sastaff-form-footer">
                <div className="sastaff-form-actions">
                  <button type="submit" className="btn-large sastaff-btn-save">{mode === 'create' ? 'Tạo Mới' : 'Lưu Thay Đổi'}</button>
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
