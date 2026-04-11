import { useEffect, useState } from 'react'
import { useAuth } from '../../services/AuthContext'
import {
  createSupermarketStaff,
  fetchSupermarketStores,
  fetchSupermarketStaff,
  removeSupermarketStaff,
  saveSupermarketStaff,
  toggleSupermarketStaffLock,
} from '../../services/supermarketAdminApi'
import './StaffManagement.css'

const statusBadge = { active: 'badge-success', warning: 'badge-warning', locked: 'badge-danger' }
const statusLabel = { active: 'Hoạt Động', warning: 'Cảnh Báo', locked: 'Bị Khóa' }

export default function StaffManagement() {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [stores, setStores] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('edit')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', phone: '', store: '', storeId: '', role: 'Staff', status: 'active', username: '', password: '' })

  useEffect(() => {
    let active = true

    async function loadStaff() {
      try {
        const [items, storeItems] = await Promise.all([
          fetchSupermarketStaff(),
          user?.id ? fetchSupermarketStores(user.id) : Promise.resolve([]),
        ])
        if (!active) return
        setStores(storeItems)
        setStaff(items.map((item) => ({
          id: item.id,
          name: item.fullName,
          email: item.email,
          phone: item.phone || '',
          store: item.store || '-',
          storeId: item.storeId || '',
          originalStoreId: item.storeId || '',
          role: item.role,
          status: item.status === 'inactive' ? 'locked' : 'active',
          joinDate: item.joinDate,
          username: item.username,
        })))
      } catch {
        if (!active) return
        setStaff([])
        setError('Không thể tải danh sách nhân viên.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStaff()
    return () => {
      active = false
    }
  }, [user])

  function openCreateModal() {
    setMode('create')
    setForm({
      name: '',
      email: '',
      phone: '',
      store: '',
      storeId: '',
      role: 'Staff',
      status: 'active',
      username: '',
      password: '',
    })
    setError('')
    setSuccess('')
    setSelectedStaff(null)
    setShowModal(true)
  }

  function openEditModal(s) {
    setMode('edit')
    setSelectedStaff(s)
    let storeId = s.storeId || s.originalStoreId || ''
    
    // Nếu storeId trống nhưng có store name, tìm ID của store đó
    if (!storeId && s.store && s.store !== '-') {
      const matchedStore = stores.find(store => store.name === s.store)
      if (matchedStore) {
        storeId = String(matchedStore.id)
      }
    }
    
    setForm({ 
      name: s.name, 
      email: s.email, 
      phone: s.phone, 
      store: s.store, 
      storeId: storeId ? String(storeId) : '', 
      role: s.role, 
      status: s.status, 
      username: s.username || '', 
      password: '' 
    })
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Họ tên không được để trống.'); return }
    if (!form.email.trim()) { setError('Email không được để trống.'); return }
    if (!form.phone.trim()) { setError('SĐT không được để trống.'); return }

    try {
      if (mode === 'create') {
        if (!form.username.trim()) { setError('Tên đăng nhập không được để trống.'); return }
        if (!form.password.trim()) { setError('Mật khẩu không được để trống.'); return }
        if (!form.storeId) { setError('Vui lòng chọn store cho nhân viên.'); return }

        await createSupermarketStaff({
          username: form.username,
          password: form.password,
          fullName: form.name,
          email: form.email,
          phone: form.phone,
          storeId: Number(form.storeId),
        })

        const refreshed = await fetchSupermarketStaff()
        setStaff(refreshed.map((item) => ({
          id: item.id,
          name: item.fullName,
          email: item.email,
          phone: item.phone || '',
          store: item.store || '-',
          role: item.role,
          status: item.status === 'inactive' ? 'locked' : 'active',
          joinDate: item.joinDate,
          username: item.username,
        })))
        setSuccess('Đã tạo nhân viên mới.')
      } else {
        await saveSupermarketStaff(selectedStaff.id, {
          username: form.username || selectedStaff.username,
          fullName: form.name,
          email: form.email,
          phone: form.phone,
          storeId: form.storeId ? Number(form.storeId) : undefined,
        })

        setStaff(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, ...form } : s))
        setSuccess('Đã cập nhật thông tin nhân viên.')
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Thao tác thất bại.')
    }
  }

  async function toggleLock(s) {
    try {
      await toggleSupermarketStaffLock(s.id)
      const next = s.status === 'locked' ? 'active' : 'locked'
      setStaff(prev => prev.map(st => st.id === s.id ? { ...st, status: next } : st))
    } catch {
      setError('Không thể thay đổi trạng thái khóa.')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Xóa nhân viên này?')) return
    try {
      await removeSupermarketStaff(id)
      setStaff(prev => prev.filter(s => s.id !== id))
    } catch {
      setError('Không thể xóa nhân viên.')
    }
    if (selectedStaff?.id === id) closeModal()
  }

  return (
    <div className="sastaff-page">
      {/* TOOLBAR */}
      <div className="sastaff-toolbar">
        <div className="sastaff-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${staff.length} nhân viên`}</div>
        <button onClick={openCreateModal} className="sastaff-btn-create"> Thêm Nhân Viên</button>
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
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {!loading && staff.length === 0 && (
                <tr>
                  <td colSpan="6">Không có dữ liệu nhân viên.</td>
                </tr>
              )}
              {staff.map(s => (
                <tr key={s.id}>
                  <td><span className="sastaff-name">{s.name}</span></td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.store}</td>
                  <td>{s.role}</td>
                  <td>
                    <div className="sastaff-action-buttons">
                      <button onClick={() => openEditModal(s)} className="sastaff-btn-edit" title="Sửa">
                        <svg className="sastaff-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="sastaff-btn-delete" title="Xóa">
                        <svg className="sastaff-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Xóa
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
              <button className="sastaff-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sastaff-modal-body">
                <div className="sastaff-form-grid">
                  {mode === 'create' ? (
                    <>
                      <div className="sastaff-form-field">
                        <label>Họ Tên</label>
                        <input name="name" value={form.name} onChange={handleChange} className="sastaff-input" placeholder="Nhập họ tên" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Tên Đăng Nhập</label>
                        <input name="username" value={form.username} onChange={handleChange} className="sastaff-input" placeholder="Nhập username" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} className="sastaff-input" placeholder="Nhập email" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Mật Khẩu</label>
                        <input name="password" type="password" value={form.password} onChange={handleChange} className="sastaff-input" placeholder="Tối thiểu 6 ký tự" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Điện Thoại</label>
                        <input name="phone" value={form.phone} onChange={handleChange} className="sastaff-input" placeholder="Nhập SĐT" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Store</label>
                        <select name="storeId" value={form.storeId} onChange={handleChange} className="sastaff-input" required>
                          <option value="">Chọn store</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="sastaff-form-field">
                        <label>Họ Tên</label>
                        <input name="name" value={form.name} onChange={handleChange} className="sastaff-input" placeholder="Nhập họ tên" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Tên Đăng Nhập</label>
                        <input name="username" value={form.username} onChange={handleChange} className="sastaff-input" disabled />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} className="sastaff-input" placeholder="Nhập email" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Store</label>
                        <select name="storeId" value={form.storeId} onChange={handleChange} className="sastaff-input" required>
                          <option value="">Chọn store</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sastaff-form-field">
                        <label>Điện Thoại</label>
                        <input name="phone" value={form.phone} onChange={handleChange} className="sastaff-input" placeholder="Nhập SĐT" required />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Chức Vụ</label>
                        <input name="role" value={form.role} onChange={handleChange} className="sastaff-input" disabled />
                      </div>
                      <div className="sastaff-form-field">
                        <label>Trạng Thái</label>
                        <input name="status" value={form.status} onChange={handleChange} className="sastaff-input" disabled />
                      </div>
                    </>
                  )}
                </div>
                {error && <p className="sastaff-error">{error}</p>}
                {success && <p className="sastaff-success">{success}</p>}
              </div>
              <div className="sastaff-modal-footer">
                <button type="submit" className="sastaff-btn-save">{mode === 'create' ? 'Tạo Mới' : 'Lưu Thay Đổi'}</button>
                <button type="button" className="sastaff-btn-cancel" onClick={closeModal}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
