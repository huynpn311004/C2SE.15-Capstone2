import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import {
  createAdminSupermarketAccount,
  createAdminSupermarketWithAccount,
  deleteAdminSupermarket,
  fetchAdminSupermarkets,
  toggleAdminSupermarketLock,
  updateAdminSupermarket,
} from '../../services/adminApi'
import './SupermarketManagement.css'

/**
 * Trang Quản lý siêu thị
 * System Admin duyệt/từ chối đăng ký siêu thị
 */
export default function SupermarketManagement() {
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [supermarkets, setSupermarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedSupermarket, setSelectedSupermarket] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    director: '',
    email: '',
    phone: '',
    address: '',
    requestDate: '',
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createForm, setCreateForm] = useState({
    name: '',
    director: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    requestDate: getTodayDate(),
    activityStatus: 'active',
  })

  async function loadSupermarkets() {
    try {
      setError('')
      const items = await fetchAdminSupermarkets()
      setSupermarkets(items)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách siêu thị.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupermarkets()
  }, [])

  const filteredSupermarkets = supermarkets

  async function handleToggleLockSupermarket(id) {
    try {
      await toggleAdminSupermarketLock(id)
      await loadSupermarkets()
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể khóa/mở khóa siêu thị.')
    }
  }

  async function handleDeleteSupermarket(id) {
    const supermarket = supermarkets.find((item) => item.id === id)
    if (!supermarket) {
      return
    }

    const confirmed = window.confirm(`Xóa siêu thị ${supermarket.name}?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteAdminSupermarket(id)
      await loadSupermarkets()
      if (selectedSupermarket && selectedSupermarket.id === id) {
        closeDetail()
      }
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa siêu thị.')
    }
  }

  function resetCreateForm() {
    setCreateForm({
      name: '',
      director: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      requestDate: getTodayDate(),
      activityStatus: 'active',
    })
    setCreateError('')
    setCreateSuccess('')
  }

  function openCreateModal() {
    resetCreateForm()
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    resetCreateForm()
  }

  function handleCreateFormChange(event) {
    const { name, value } = event.target

    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setCreateError('')
    setCreateSuccess('')
  }

  async function submitCreateAccount(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    const supermarket = supermarkets.find((item) => !item.accountCreated) || supermarkets[0]

    if (!createForm.name.trim()) {
      setCreateError('Tên siêu thị không được để trống.')
      return
    }

    if (!createForm.director.trim()) {
      setCreateError('Người đại diện không được để trống.')
      return
    }

    if (!createForm.email.trim()) {
      setCreateError('Email không được để trống.')
      return
    }

    if (!createForm.phone.trim()) {
      setCreateError('Điện thoại không được để trống.')
      return
    }

    if (!createForm.requestDate) {
      setCreateError('Ngày đăng ký không được để trống.')
      return
    }

    if (createForm.password.length < 6) {
      setCreateError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Mật khẩu xác nhận không khớp.')
      return
    }

    try {
      const payload = {
        name: createForm.name.trim(),
        director: createForm.director.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        activityStatus: createForm.activityStatus,
      }

      if (supermarket) {
        await createAdminSupermarketAccount(supermarket.id, payload)
        setCreateSuccess(
          supermarket.accountCreated
            ? `Đã cập nhật lại tài khoản cho ${supermarket.name}.`
            : `Đã tạo tài khoản thành công cho ${supermarket.name}.`
        )
      } else {
        await createAdminSupermarketWithAccount(payload)
        setCreateSuccess(`Đã tạo tài khoản thành công cho ${payload.name}.`)
      }

      await loadSupermarkets()
    } catch (err) {
      setCreateError(err?.response?.data?.detail || 'Không thể tạo tài khoản siêu thị.')
      return
    }

    setTimeout(() => {
      closeCreateModal()
    }, 600)
  }

  function openDetail(supermarket) {
    setSelectedSupermarket(supermarket)
    setEditForm({
      name: supermarket.name,
      director: supermarket.director,
      email: supermarket.email,
      phone: supermarket.phone,
      address: supermarket.address,
      requestDate: supermarket.requestDate,
    })
    setEditError('')
    setEditSuccess('')
    setShowDetailModal(true)
  }

  function closeDetail() {
    setShowDetailModal(false)
    setSelectedSupermarket(null)
    setEditError('')
    setEditSuccess('')
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setEditError('')
    setEditSuccess('')
  }

  async function submitEditSupermarket(event) {
    event.preventDefault()

    if (!selectedSupermarket) {
      return
    }

    if (!editForm.name.trim()) {
      setEditError('Tên siêu thị không được để trống.')
      return
    }

    if (!editForm.director.trim()) {
      setEditError('Người đại diện không được để trống.')
      return
    }

    if (!editForm.email.trim()) {
      setEditError('Email không được để trống.')
      return
    }

    if (!editForm.phone.trim()) {
      setEditError('Điện thoại không được để trống.')
      return
    }

    if (!editForm.address.trim()) {
      setEditError('Địa chỉ không được để trống.')
      return
    }

    if (!editForm.requestDate) {
      setEditError('Ngày đăng ký không được để trống.')
      return
    }

    const nextData = {
      name: editForm.name.trim(),
      director: editForm.director.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      requestDate: editForm.requestDate,
    }

    try {
      await updateAdminSupermarket(selectedSupermarket.id, nextData)
      setEditSuccess('Đã cập nhật thông tin siêu thị.')
      await loadSupermarkets()
    } catch (err) {
      setEditError(err?.response?.data?.detail || 'Không thể cập nhật thông tin siêu thị.')
    }
  }

  return (
    <SystemAdminLayout>
      <div className="supermarkets-page">
        {/* FILTERS */}
        <div className="supermarkets-toolbar">
          <button
            className="supermarkets-btn-create supermarkets-toolbar-btn"
            onClick={openCreateModal}
          >
            Tạo Tài Khoản
          </button>
          <div className="supermarkets-toolbar-info">Hiển thị {filteredSupermarkets.length} siêu thị</div>
        </div>

        {/* TABLE */}
        <div className="supermarkets-card">
          {loading && <div className="empty-cell">Đang tải dữ liệu...</div>}
          {error && <div className="empty-cell">{error}</div>}
          <div className="table-responsive">
            <table className="supermarkets-table">
              <thead>
                <tr>
                  <th>Tên Siêu Thị</th>
                  <th>Người Đại Diện</th>
                  <th>Email</th>
                  <th>Điện Thoại</th>
                  <th>Ngày Đăng Ký</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupermarkets.length > 0 ? (
                  filteredSupermarkets.map((sm) => (
                    <tr key={sm.id}>
                      <td>
                        <div className="supermarkets-name">{sm.name}</div>
                      </td>
                      <td>{sm.director}</td>
                      <td>
                        <a href={`mailto:${sm.email}`}>{sm.email}</a>
                      </td>
                      <td>{sm.phone}</td>
                      <td>{new Date(sm.requestDate).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div className="action-group">
                          <button
                            className="action-btn icon-action-btn btn-edit"
                            onClick={() => openDetail(sm)}
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" />
                            </svg>
                          </button>
                          <button
                            className={`action-btn icon-action-btn ${sm.isLocked ? 'btn-unlock-small' : 'btn-lock-small'}`}
                            onClick={() => handleToggleLockSupermarket(sm.id)}
                            title={sm.isLocked ? 'Mở khóa siêu thị' : 'Khóa siêu thị'}
                            aria-label={sm.isLocked ? 'Mở khóa siêu thị' : 'Khóa siêu thị'}
                          >
                            {sm.isLocked ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M17 9h-7V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z" />
                              </svg>
                            )}
                          </button>
                          <button
                            className="action-btn icon-action-btn btn-delete-small"
                            onClick={() => handleDeleteSupermarket(sm.id)}
                            title="Xóa siêu thị"
                            aria-label="Xóa siêu thị"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL MODAL */}
        {showDetailModal && selectedSupermarket && (
          <div className="supermarkets-modal-overlay" onClick={closeDetail}>
            <div className="supermarkets-modal supermarkets-edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chỉnh Sửa Siêu Thị</h3>
                <button className="modal-close" onClick={closeDetail}>✕</button>
              </div>
              <form className="modal-body supermarkets-edit-form" onSubmit={submitEditSupermarket}>
                <div className="create-form-grid">
                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Tên Siêu Thị</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập tên siêu thị"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Người Đại Diện</label>
                      <input
                        type="text"
                        name="director"
                        value={editForm.director}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập tên người đại diện"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập email"
                        required
                      />
                    </div>
                  </div>

                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Điện Thoại</label>
                      <input
                        type="text"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Địa Chỉ</label>
                      <input
                        type="text"
                        name="address"
                        value={editForm.address}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập địa chỉ"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Ngày Đăng Ký</label>
                      <input
                        type="date"
                        name="requestDate"
                        value={editForm.requestDate}
                        onChange={handleEditFormChange}
                        className="supermarkets-input"
                        required
                      />
                    </div>
                  </div>
                </div>

                {editError && <p className="supermarkets-error">{editError}</p>}
                {editSuccess && <p className="supermarkets-success">{editSuccess}</p>}

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large supermarkets-btn-create">
                      Lưu Thay Đổi
                    </button>
                    <button type="button" className="btn-large btn-close" onClick={closeDetail}>
                      Hủy
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="supermarkets-modal-overlay" onClick={closeCreateModal}>
            <div className="supermarkets-modal supermarkets-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Tạo Tài Khoản Siêu Thị</h3>
                <button className="modal-close" onClick={closeCreateModal}>✕</button>
              </div>

              <form className="modal-body supermarkets-create-form" onSubmit={submitCreateAccount}>
                <div className="create-form-grid">
                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Tên Siêu Thị</label>
                      <input
                        type="text"
                        name="name"
                        value={createForm.name}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập tên siêu thị"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Người Đại Diện</label>
                      <input
                        type="text"
                        name="director"
                        value={createForm.director}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập tên người đại diện"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={createForm.email}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập email"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Điện Thoại</label>
                      <input
                        type="text"
                        name="phone"
                        value={createForm.phone}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>
                  </div>

                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Mật Khẩu</label>
                      <input
                        type="password"
                        name="password"
                        value={createForm.password}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập mật khẩu"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Xác Nhận Mật Khẩu</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={createForm.confirmPassword}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        placeholder="Nhập lại mật khẩu"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Ngày Đăng Ký</label>
                      <input
                        type="date"
                        name="requestDate"
                        value={createForm.requestDate}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Trạng Thái Hoạt Động</label>
                      <select
                        name="activityStatus"
                        value={createForm.activityStatus}
                        onChange={handleCreateFormChange}
                        className="supermarkets-input"
                      >
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Bị khóa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {createError && <p className="supermarkets-error">{createError}</p>}
                {createSuccess && <p className="supermarkets-success">{createSuccess}</p>}

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large supermarkets-btn-create">
                      Tạo Mới
                    </button>
                    <button type="button" className="btn-large btn-close" onClick={closeCreateModal}>
                      Hủy
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SystemAdminLayout>
  )
}
