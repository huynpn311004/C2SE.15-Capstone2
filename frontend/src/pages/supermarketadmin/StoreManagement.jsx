import { useEffect, useState } from 'react'
import { useAuth } from '../../services/AuthContext'
import {
  createSupermarketStore,
  fetchSupermarketStores,
  removeSupermarketStore,
  saveSupermarketStore,
} from '../../services/supermarketAdminApi'
import './StoreManagement.css'

const statusBadge = { active: 'badge-success', warning: 'badge-warning', inactive: 'badge-danger' }
const statusLabel = { active: 'Hoạt Động', warning: 'Cảnh Báo', inactive: 'Bị Khóa' }

export default function StoreManagement() {
  const { user } = useAuth()
  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('edit')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', status: 'active' })

  useEffect(() => {
    let active = true

    async function loadStores() {
      if (!user?.id) {
        if (active) {
          setStores([])
          setEditError('Không tìm thấy tài khoản đăng nhập.')
          setLoading(false)
        }
        return
      }

      try {
        const items = await fetchSupermarketStores(user.id)
        if (active) {
          setStores(items)
          setEditError('')
        }
      } catch {
        if (active) {
          setStores([])
          setEditError('Không thể tải danh sách store.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadStores()
    return () => {
      active = false
    }
  }, [user])

  function openEditModal(store) {
    setMode('edit')
    setSelectedStore(store)
    setEditForm({
      name: store.name,
      address: store.address,
      phone: store.phone,
      status: store.status,
    })
    setEditError('')
    setEditSuccess('')
    setShowModal(true)
  }

  function openCreateModal() {
    setMode('create')
    setSelectedStore(null)
    setEditForm({ name: '', address: '', phone: '', status: 'active' })
    setEditError('')
    setEditSuccess('')
    setShowModal(true)
  }

  function closeEditModal() {
    setShowModal(false)
    setSelectedStore(null)
    setEditError('')
    setEditSuccess('')
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
    setEditError('')
    setEditSuccess('')
  }

  async function submitEdit(e) {
    e.preventDefault()
    setEditError('')
    if (!editForm.name.trim()) { setEditError('Tên store không được để trống.'); return }
    if (!editForm.address.trim()) { setEditError('Địa chỉ không được để trống.'); return }
    if (!editForm.phone.trim()) { setEditError('Số điện thoại không được để trống.'); return }

    try {
      if (mode === 'create') {
        await createSupermarketStore({
          name: editForm.name,
          address: editForm.address,
          phone: editForm.phone,
          status: editForm.status,
        }, user?.id)
        const items = await fetchSupermarketStores(user.id)
        setStores(items)
        setEditSuccess('Đã tạo store mới.')
      } else {
        await saveSupermarketStore(selectedStore.id, {
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
        }, user?.id)

        setStores(prev => prev.map(s => s.id === selectedStore.id ? {
          ...s,
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
        } : s))
        setEditSuccess('Đã cập nhật thông tin store.')
      }
    } catch (err) {
      setEditError(err?.message || 'Thao tác store thất bại.')
    }
  }

  async function handleDelete(id) {
    const store = stores.find(s => s.id === id)
    if (!store) return
    if (!window.confirm(`Xóa store ${store.name}?`)) return
    try {
      await removeSupermarketStore(id, user?.id)
      setStores(prev => prev.filter(s => s.id !== id))
    } catch {
      setEditError('Không thể xóa store.')
    }
    if (selectedStore?.id === id) closeEditModal()
  }

  return (
    <div className="sastore-page">
      {/* TOOLBAR */}
      <div className="sastore-toolbar">
        <div className="sastore-toolbar-info">{loading ? 'Đang tải...' : `Hiển thị ${stores.length} store`}</div>
        <button onClick={openCreateModal} className="sastaff-btn-create"> Tạo Store</button>
      </div>

      {/* TABLE */}
      <div className="sastore-card">
        <div className="table-responsive">
          <table className="sastore-table">
            <thead>
              <tr>
                <th>Tên Store</th>
                <th>Địa Chỉ</th>
                <th>Điện Thoại</th>
                <th>Staff</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {!loading && stores.length === 0 && (
                <tr>
                  <td colSpan="6">Chưa có store nào.</td>
                </tr>
              )}
              {stores.map(store => (
                <tr key={store.id}>
                  <td><span className="sastore-name">{store.name}</span></td>
                  <td>{store.address}</td>
                  <td>{store.phone}</td>
                  <td>{store.staffCount}</td>
                  <td><span className={`badge ${statusBadge[store.status] || 'badge-warning'}`}>{statusLabel[store.status] || store.status}</span></td>
                  <td>
                    <div className="sastore-action-buttons">
                      <button onClick={() => openEditModal(store)} className="sastore-btn-edit" title="Chỉnh sửa">
                        <svg className="sastore-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Sửa
                      </button>
                      <button onClick={() => handleDelete(store.id)} className="sastore-btn-delete" title="Xóa">
                        <svg className="sastore-icon" viewBox="0 0 24 24" fill="currentColor">
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

      {/* EDIT MODAL */}
      {showModal && (
        <div className="sastore-modal-overlay" onClick={closeEditModal}>
          <div className="sastore-modal" onClick={e => e.stopPropagation()}>
            <div className="sastore-modal-header">
              <h3>{mode === 'create' ? 'Tạo Store Mới' : 'Chỉnh Sửa Store'}</h3>
              <button className="sastore-modal-close" onClick={closeEditModal}>×</button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="sastore-modal-body">
                <div className="sastore-form-grid">
                  <div className="sastore-form-field">
                    <label>Tên Store</label>
                    <input name="name" value={editForm.name} onChange={handleEditChange} className="sastore-input" placeholder="Nhập tên store" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Điện Thoại</label>
                    <input name="phone" value={editForm.phone} onChange={handleEditChange} className="sastore-input" placeholder="Nhập số điện thoại" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Địa Chỉ</label>
                    <input name="address" value={editForm.address} onChange={handleEditChange} className="sastore-input" placeholder="Nhập địa chỉ" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Trạng Thái</label>
                    <select name="status" value={editForm.status} onChange={handleEditChange} className="sastore-input">
                      <option value="active">Hoạt Động</option>
                      <option value="warning">Cảnh Báo</option>
                    </select>
                  </div>
                </div>
                {editError && <p className="sastore-error">{editError}</p>}
                {editSuccess && <p className="sastore-success">{editSuccess}</p>}
              </div>
              <div className="sastore-modal-footer">
                <button type="submit" className="sastore-btn-save">{mode === 'create' ? 'Tạo Store' : 'Lưu Thay Đổi'}</button>
                <button type="button" className="sastore-btn-cancel" onClick={closeEditModal}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
