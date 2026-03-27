import { useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
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

  const [charities, setCharities] = useState([
    {
      id: 101,
      name: 'Hope Foundation',
      email: 'hello@hopefoundation.org',
      phone: '0285-999-8888',
      address: '100 Charity Lane, HCMC',
      requestDate: '2024-03-16',
      director: 'Dang Thi E',
      isLocked: false,
      accountCreated: false,
      accountUsername: '',
      accountStatus: '',
      passwordStatus: '',
    },
    {
      id: 102,
      name: 'Community Care',
      email: 'info@communitycare.org',
      phone: '0287-777-6666',
      address: '200 Aid Street, HCMC',
      requestDate: '2024-03-19',
      director: 'Hoang Van F',
      isLocked: false,
      accountCreated: true,
      accountUsername: 'communitycare_charity',
      accountStatus: 'active',
      passwordStatus: 'active',
    },
    {
      id: 103,
      name: 'Children Tomorrow',
      email: 'contact@childrentomorrow.org',
      phone: '0243-444-3333',
      address: '300 Future Road, HN',
      requestDate: '2024-02-10',
      director: 'Nguyen Thi G',
      isLocked: false,
      accountCreated: false,
      accountUsername: '',
      accountStatus: '',
      passwordStatus: '',
    },
  ])

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
    charityId: '',
    name: '',
    director: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    requestDate: getTodayDate(),
    passwordStatus: 'active',
  })

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

  function submitEditCharity(event) {
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

    setCharities((prev) =>
      prev.map((item) =>
        item.id === selectedCharity.id
          ? {
              ...item,
              ...nextData,
            }
          : item
      )
    )

    setSelectedCharity((prev) =>
      prev
        ? {
            ...prev,
            ...nextData,
          }
        : prev
    )

    setEditSuccess('Đã cập nhật thông tin charity.')
  }

  function handleToggleLockCharity(id) {
    setCharities((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isLocked: !item.isLocked,
            }
          : item
      )
    )

    setSelectedCharity((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            isLocked: !prev.isLocked,
          }
        : prev
    )
  }

  function handleDeleteCharity(id) {
    const charity = charities.find((item) => item.id === id)
    if (!charity) {
      return
    }

    const confirmed = window.confirm(`Xóa tổ chức ${charity.name}?`)
    if (!confirmed) {
      return
    }

    setCharities((prev) => prev.filter((item) => item.id !== id))

    if (selectedCharity && selectedCharity.id === id) {
      closeDetail()
    }
  }

  function handleCreateAccount(charity) {
    const isLockedByStatus = createForm.passwordStatus === 'locked'

    setCharities((prev) =>
      prev.map((item) =>
        item.id === charity.id
          ? {
              ...item,
              name: createForm.name.trim(),
              director: createForm.director.trim(),
              email: createForm.email.trim(),
              phone: createForm.phone.trim(),
              requestDate: createForm.requestDate,
              isLocked: isLockedByStatus,
              accountCreated: true,
              accountUsername: createForm.email.trim(),
              accountStatus: isLockedByStatus ? 'inactive' : 'active',
              passwordStatus: createForm.passwordStatus,
            }
          : item
      )
    )

    setSelectedCharity((prev) =>
      prev && prev.id === charity.id
        ? {
            ...prev,
            name: createForm.name.trim(),
            director: createForm.director.trim(),
            email: createForm.email.trim(),
            phone: createForm.phone.trim(),
            requestDate: createForm.requestDate,
            isLocked: isLockedByStatus,
            accountCreated: true,
            accountUsername: createForm.email.trim(),
            accountStatus: isLockedByStatus ? 'inactive' : 'active',
            passwordStatus: createForm.passwordStatus,
          }
        : prev
    )
  }

  const pendingCharities = charities.filter((charity) => !charity.accountCreated)

  function resetCreateForm(charityId = '') {
    setCreateForm({
      charityId: charityId ? String(charityId) : '',
      name: '',
      director: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      requestDate: getTodayDate(),
      passwordStatus: 'active',
    })
    setCreateError('')
    setCreateSuccess('')
  }

  function openCreateModal() {
    const charityId = pendingCharities[0]?.id

    if (!charityId) {
      window.alert('Không còn charity nào cần tạo tài khoản.')
      return
    }

    resetCreateForm(charityId)
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    resetCreateForm('')
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

  function submitCreateAccount(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    const selectedId = Number(createForm.charityId)
    const charity = charities.find((item) => item.id === selectedId)

    if (!charity || charity.accountCreated) {
      setCreateError('Charity đã có tài khoản hoặc không hợp lệ.')
      return
    }

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

    handleCreateAccount(charity)
    setCreateSuccess(`Đã tạo tài khoản thành công cho ${charity.name}.`)

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
            disabled={pendingCharities.length === 0}
          >
            Tạo Tài Khoản
          </button>
          <div className="charities-toolbar-info">
            Hiển thị {charities.length} charity
          </div>
        </div>

        {/* TABLE */}
        <div className="charities-card">
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
                      <td>
                        <div className="action-group">
                          <button
                            className="action-btn icon-action-btn btn-edit"
                            onClick={() => openDetail(charity)}
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" />
                            </svg>
                          </button>
                          <button
                            className={`action-btn icon-action-btn ${charity.isLocked ? 'btn-unlock-small' : 'btn-lock-small'}`}
                            onClick={() => handleToggleLockCharity(charity.id)}
                            title={charity.isLocked ? 'Mở khóa tổ chức' : 'Khóa tổ chức'}
                            aria-label={charity.isLocked ? 'Mở khóa tổ chức' : 'Khóa tổ chức'}
                          >
                            {charity.isLocked ? (
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
                            onClick={() => handleDeleteCharity(charity.id)}
                            title="Xóa tổ chức"
                            aria-label="Xóa tổ chức"
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
        {showDetailModal && selectedCharity && (
          <div className="charities-modal-overlay" onClick={closeDetail}>
            <div className="charities-modal charities-edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chỉnh Sửa Tổ Chức Từ Thiện</h3>
                <button className="modal-close" onClick={closeDetail}>✕</button>
              </div>
              <form className="modal-body" onSubmit={submitEditCharity}>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Tên Tổ Chức</label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditFormChange}
                      className="charities-input"
                      required
                    />
                  </div>
                  <div className="detail-field">
                    <label>Người Đại Diện</label>
                    <input
                      type="text"
                      name="director"
                      value={editForm.director}
                      onChange={handleEditFormChange}
                      className="charities-input"
                      required
                    />
                  </div>
                  <div className="detail-field">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditFormChange}
                      className="charities-input"
                      required
                    />
                  </div>
                  <div className="detail-field">
                    <label>Điện Thoại</label>
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditFormChange}
                      className="charities-input"
                      required
                    />
                  </div>
                  <div className="detail-field">
                    <label>Địa Chỉ</label>
                    <input
                      type="text"
                      name="address"
                      value={editForm.address}
                      onChange={handleEditFormChange}
                      className="charities-input"
                      required
                    />
                  </div>
                  <div className="detail-field">
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

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large charities-btn-create">
                      Lưu thay đổi
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
          <div className="charities-modal-overlay" onClick={closeCreateModal}>
            <div className="charities-modal charities-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Tạo Tài khoản Tổ Chức Từ Thiện</h3>
                <button className="modal-close" onClick={closeCreateModal}>✕</button>
              </div>

              <form className="modal-body charities-form" onSubmit={submitCreateAccount}>
                <div className="create-form-grid charities-create-grid">
                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
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

                  <div className="create-form-field">
                    <label>Trạng Thái Hoạt Động</label>
                    <select
                      name="passwordStatus"
                      value={createForm.passwordStatus}
                      onChange={handleCreateFormChange}
                      className="charities-input"
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="locked">Bị khóa</option>
                    </select>
                  </div>
                </div>

                {createError && <p className="charities-error">{createError}</p>}
                {createSuccess && <p className="charities-success">{createSuccess}</p>}

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large charities-btn-create">
                      Tạo mới
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
