import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import {
  createAdminCharityAccount,
  createAdminCharityWithAccount,
  deleteAdminCharity,
  fetchAdminCharities,
  toggleAdminCharityLock,
  updateAdminCharity,
} from '../../services/adminApi'
import './CharityManagement.css'

/**
 * Trang Quản lý Charity Organization
 * System Admin quản lý thông tin charity
 */
export default function CharityManagement() {
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedCharity, setSelectedCharity] = useState(null)
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
    address: '',
    password: '',
    confirmPassword: '',
    requestDate: getTodayDate(),
    activityStatus: 'active',
  })

  async function loadCharities() {
    try {
      setError('')
      const items = await fetchAdminCharities()
      setCharities(items)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách tổ chức từ thiện.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCharities()
  }, [])

  function openDetail(charity) {
    setSelectedCharity(charity)
    setEditForm({
      name: charity.name,
      director: charity.director,
      email: charity.email,
      phone: charity.phone,
      address: charity.address,
      requestDate: charity.requestDate,
    })
    setEditError('')
    setEditSuccess('')
    setShowDetailModal(true)
  }

  function closeDetail() {
    setShowDetailModal(false)
    setSelectedCharity(null)
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

  async function submitEditCharity(event) {
    event.preventDefault()

    if (!selectedCharity) {
      return
    }

    if (!editForm.name.trim()) {
      setEditError('Tên tổ chức không được để trống.')
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
      await updateAdminCharity(selectedCharity.id, nextData)
      setEditSuccess('Đã cập nhật thông tin charity.')
      await loadCharities()
    } catch (err) {
      setEditError(err?.response?.data?.detail || 'Không thể cập nhật charity.')
    }
  }

  async function handleToggleLockCharity(id) {
    try {
      await toggleAdminCharityLock(id)
      await loadCharities()
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể khóa/mở khóa charity.')
    }
  }

  async function handleDeleteCharity(id) {
    const charity = charities.find((item) => item.id === id)
    if (!charity) {
      return
    }

    const confirmed = window.confirm(`Xóa tổ chức ${charity.name}?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteAdminCharity(id)
      await loadCharities()
      if (selectedCharity && selectedCharity.id === id) {
        closeDetail()
      }
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa charity.')
    }
  }

  function resetCreateForm() {
    setCreateForm({
      name: '',
      director: '',
      email: '',
      phone: '',
      address: '',
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

    if (!createForm.name.trim()) {
      setCreateError('Tên tổ chức không được để trống.')
      return
    }

    if (!createForm.director.trim()) {
      setCreateError('Giám đốc không được để trống.')
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

    if (!createForm.address.trim()) {
      setCreateError('Địa chỉ không được để trống.')
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
        address: createForm.address.trim(),
        password: createForm.password,
        activityStatus: createForm.activityStatus,
      }

      await createAdminCharityWithAccount(payload)
      setCreateSuccess(`Đã tạo tài khoản thành công cho ${payload.name}.`)
      await loadCharities()
    } catch (err) {
      setCreateError(err?.response?.data?.detail || 'Không thể tạo tài khoản charity.')
      return
    }

    setTimeout(() => {
      closeCreateModal()
    }, 600)
  }

  return (
    <SystemAdminLayout>
      <div className="charities-page">

        {/* FILTERS */}
        <div className="charities-toolbar">
          <button
            className="charities-btn-create charities-toolbar-btn"
            onClick={openCreateModal}
          >
            Tạo Tài Khoản
          </button>
          <div className="charities-toolbar-info">
            Hiển thị {charities.length} tổ chức từ thiện
          </div>
        </div>

        {/* TABLE */}
        <div className="charities-card">
          {loading && <div className="empty-cell">Đang tải dữ liệu...</div>}
          {error && <div className="empty-cell">{error}</div>}
          <div className="table-responsive">
            <table className="charities-table">
              <thead>
                <tr>
                  <th>Tên Tổ Chức</th>
                  <th>Người Đại Diện</th>
                  <th>Email</th>
                  <th>Điện Thoại</th>
                  <th>Ngày Đăng Ký</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {charities.length > 0 ? (
                  charities.map((charity) => (
                    <tr key={charity.id}>
                      <td>
                        <div className="charities-name">{charity.name}</div>
                      </td>
                      <td>{charity.director}</td>
                      <td>
                        <a href={`mailto:${charity.email}`}>{charity.email}</a>
                      </td>
                      <td>{charity.phone}</td>
                      <td>{new Date(charity.requestDate).toLocaleDateString('vi-VN')}</td>
                      <td className="charities-actions-cell">
                        <div className="charities-actions">
                          <button
                            className="charities-btn-edit"
                            onClick={() => openDetail(charity)}
                            title="Chỉnh sửa"
                          >
                            <svg className="charities-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z"/>
                            </svg>
                            Sửa
                          </button>
                          <button
                            className={`charities-btn-lock ${charity.isLocked ? 'charities-btn-unlock' : 'charities-btn-lock-active'}`}
                            onClick={() => handleToggleLockCharity(charity.id)}
                            title={charity.isLocked ? 'Mở khóa tổ chức' : 'Khóa tổ chức'}
                          >
                            {charity.isLocked ? (
                              <>
                                <svg className="charities-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-7V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z"/>
                                </svg>
                                Mở khóa
                              </>
                            ) : (
                              <>
                                <svg className="charities-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z"/>
                                </svg>
                                Khóa
                              </>
                            )}
                          </button>
                          <button
                            className="charities-btn-delete"
                            onClick={() => handleDeleteCharity(charity.id)}
                            title="Xóa tổ chức"
                          >
                            <svg className="charities-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Xóa
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

        {/* EDIT MODAL */}
        {showDetailModal && selectedCharity && (
          <div className="charities-modal-overlay" onClick={closeDetail}>
            <div className="charities-modal charities-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="charities-modal-header">
                <h3>Chỉnh Sửa Tổ Chức Từ Thiện</h3>
                <button className="charities-modal-close" onClick={closeDetail}>×</button>
              </div>
              <form onSubmit={submitEditCharity}>
                <div className="charities-modal-body">
                  <div className="charities-create-grid">
                    <div className="charities-form-field">
                      <label>Tên Tổ Chức</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        placeholder="Nhập tên tổ chức"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Người Đại Diện</label>
                      <input
                        type="text"
                        name="director"
                        value={editForm.director}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        placeholder="Nhập tên người đại diện"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        placeholder="Nhập email"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Điện Thoại</label>
                      <input
                        type="text"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Địa Chỉ</label>
                      <input
                        type="text"
                        name="address"
                        value={editForm.address}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        placeholder="Nhập địa chỉ"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Ngày Đăng Ký</label>
                      <input
                        type="date"
                        name="requestDate"
                        value={editForm.requestDate}
                        onChange={handleEditFormChange}
                        className="charities-input"
                        required
                      />
                    </div>
                  </div>

                  {editError && <p className="charities-error">{editError}</p>}
                  {editSuccess && <p className="charities-success">{editSuccess}</p>}
                </div>

                <div className="charities-modal-footer">
                  <button type="submit" className="charities-btn-create">
                    Lưu Thay Đổi
                  </button>
                  <button type="button" className="charities-btn-cancel" onClick={closeDetail}>
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="charities-modal-overlay" onClick={closeCreateModal}>
            <div className="charities-modal charities-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="charities-modal-header">
                <h3>Tạo Tài Khoản Tổ Chức Từ Thiện</h3>
                <button className="charities-modal-close" onClick={closeCreateModal}>×</button>
              </div>
              <form onSubmit={submitCreateAccount}>
                <div className="charities-modal-body">
                  <div className="charities-create-grid">
                    <div className="charities-form-field">
                      <label>Tên Tổ Chức</label>
                      <input
                        type="text"
                        name="name"
                        value={createForm.name}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập tên tổ chức"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Người Đại Diện</label>
                      <input
                        type="text"
                        name="director"
                        value={createForm.director}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập tên người đại diện"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={createForm.email}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập email"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Điện Thoại</label>
                      <input
                        type="text"
                        name="phone"
                        value={createForm.phone}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Địa Chỉ</label>
                      <input
                        type="text"
                        name="address"
                        value={createForm.address}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập địa chỉ"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Mật Khẩu</label>
                      <input
                        type="password"
                        name="password"
                        value={createForm.password}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập mật khẩu"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Xác Nhận Mật Khẩu</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={createForm.confirmPassword}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        placeholder="Nhập lại mật khẩu"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Ngày Đăng Ký</label>
                      <input
                        type="date"
                        name="requestDate"
                        value={createForm.requestDate}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                        required
                      />
                    </div>

                    <div className="charities-form-field">
                      <label>Trạng Thái Hoạt Động</label>
                      <select
                        name="activityStatus"
                        value={createForm.activityStatus}
                        onChange={handleCreateFormChange}
                        className="charities-input"
                      >
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Bị khóa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {createError && <p className="charities-error">{createError}</p>}
                {createSuccess && <p className="charities-success">{createSuccess}</p>}

                <div className="charities-modal-footer">
                  <button type="submit" className="charities-btn-create">
                    Tạo mới
                  </button>
                  <button type="button" className="charities-btn-cancel" onClick={closeCreateModal}>
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SystemAdminLayout>
  )
}
