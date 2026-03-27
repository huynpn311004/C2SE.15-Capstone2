import { useState } from 'react'
import './StoreManagement.css'

const seedStores = [
  { id: 1, name: 'BigMart Q1', address: '123 Nguyễn Huệ, Q1, HCM', manager: 'Trần Văn A', phone: '0901 111 222', status: 'active', staffCount: 5 },
  { id: 2, name: 'BigMart Q3', address: '456 Lý Thường Kiệt, Q3, HCM', manager: 'Lê Thị B', phone: '0902 333 444', status: 'active', staffCount: 4 },
  { id: 3, name: 'BigMart Q5', address: '789 Nguyễn Trãi, Q5, HCM', manager: 'Phạm Văn C', phone: '0903 555 666', status: 'warning', staffCount: 3 },
  { id: 4, name: 'BigMart Q7', address: '321 Điện Biên Phủ, Q7, HCM', manager: 'Nguyễn Thị D', phone: '0904 777 888', status: 'active', staffCount: 6 },
]

const statusBadge = { active: 'badge-success', warning: 'badge-warning' }
const statusLabel = { active: 'Hoạt Động', warning: 'Cảnh Báo' }

export default function StoreManagement() {
  const [stores, setStores] = useState(seedStores)
  const [selectedStore, setSelectedStore] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editForm, setEditForm] = useState({ name: '', address: '', manager: '', phone: '', status: 'active' })

  function openEditModal(store) {
    setSelectedStore(store)
    setEditForm({ name: store.name, address: store.address, manager: store.manager, phone: store.phone, status: store.status })
    setEditError('')
    setEditSuccess('')
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
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

  function submitEdit(e) {
    e.preventDefault()
    setEditError('')
    if (!editForm.name.trim()) { setEditError('Tên store không được để trống.'); return }
    if (!editForm.address.trim()) { setEditError('Địa chỉ không được để trống.'); return }
    if (!editForm.manager.trim()) { setEditError('Tên quản lý không được để trống.'); return }
    if (!editForm.phone.trim()) { setEditError('Số điện thoại không được để trống.'); return }

    setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, ...editForm } : s))
    setEditSuccess('Đã cập nhật thông tin store.')
  }

  function handleDelete(id) {
    const store = stores.find(s => s.id === id)
    if (!store) return
    if (!window.confirm(`Xóa store ${store.name}?`)) return
    setStores(prev => prev.filter(s => s.id !== id))
    if (selectedStore?.id === id) closeEditModal()
  }

  return (
    <div className="sastore-page">
      {/* TOOLBAR */}
      <div className="sastore-toolbar">
        <div className="sastore-toolbar-info">Hiển thị {stores.length} store</div>
      </div>

      {/* TABLE */}
      <div className="sastore-card">
        <div className="table-responsive">
          <table className="sastore-table">
            <thead>
              <tr>
                <th>Tên Store</th>
                <th>Địa Chỉ</th>
                <th>Quản Lý</th>
                <th>Điện Thoại</th>
                <th>Staff</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(store => (
                <tr key={store.id}>
                  <td><span className="sastore-name">{store.name}</span></td>
                  <td>{store.address}</td>
                  <td>{store.manager}</td>
                  <td>{store.phone}</td>
                  <td>{store.staffCount}</td>
                  <td><span className={`badge ${statusBadge[store.status]}`}>{statusLabel[store.status]}</span></td>
                  <td>
                    <div className="action-group">
                      <button onClick={() => openEditModal(store)} className="action-btn icon-action-btn btn-edit" title="Chỉnh sửa">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(store.id)} className="action-btn icon-action-btn btn-delete-small" title="Xóa">
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

      {/* EDIT MODAL */}
      {showEditModal && selectedStore && (
        <div className="sastore-modal-overlay" onClick={closeEditModal}>
          <div className="sastore-modal" onClick={e => e.stopPropagation()}>
            <div className="sastore-modal-header">
              <h3>Chỉnh Sửa Store</h3>
              <button className="sastore-modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <form className="sastore-modal-body" onSubmit={submitEdit}>
              <div className="sastore-form-grid">
                <div className="sastore-form-column">
                  <div className="sastore-form-field">
                    <label>Tên Store</label>
                    <input name="name" value={editForm.name} onChange={handleEditChange} className="sastore-input" placeholder="Nhập tên store" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Quản Lý</label>
                    <input name="manager" value={editForm.manager} onChange={handleEditChange} className="sastore-input" placeholder="Nhập tên quản lý" required />
                  </div>
                </div>
                <div className="sastore-form-column">
                  <div className="sastore-form-field">
                    <label>Địa Chỉ</label>
                    <input name="address" value={editForm.address} onChange={handleEditChange} className="sastore-input" placeholder="Nhập địa chỉ" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Điện Thoại</label>
                    <input name="phone" value={editForm.phone} onChange={handleEditChange} className="sastore-input" placeholder="Nhập số điện thoại" required />
                  </div>
                  <div className="sastore-form-field">
                    <label>Trạng Thái</label>
                    <select name="status" value={editForm.status} onChange={handleEditChange} className="sastore-input">
                      <option value="active">Hoạt Động</option>
                      <option value="warning">Cảnh Báo</option>
                    </select>
                  </div>
                </div>
              </div>
              {editError && <p className="sastore-error">{editError}</p>}
              {editSuccess && <p className="sastore-success">{editSuccess}</p>}
              <div className="sastore-form-footer">
                <div className="sastore-form-actions">
                  <button type="submit" className="btn-large sastore-btn-save">Lưu Thay Đổi</button>
                  <button type="button" className="btn-large btn-close" onClick={closeEditModal}>Hủy</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
