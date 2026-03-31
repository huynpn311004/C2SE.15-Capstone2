import { useState } from 'react'
import SystemAdminLayout from '../../components/layout/Layout'
import './DeliveryManagement.css'

/**
 * Trang Quản lý Delivery Partner
 * System Admin quản lý thông tin đối tác giao hàng
 */
export default function DeliveryManagement() {
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [deliveryPartners, setDeliveryPartners] = useState([
    {
      id: 201,
      name: 'FastShip Express',
      manager: 'Nguyen Van T',
      email: 'ops@fastship.vn',
      phone: '0907 111 222',
      vehicleType: 'Xe máy',
      licensePlate: '59X3-123.45',
      requestDate: '2024-03-16',
      isLocked: false,
      accountCreated: false,
      accountUsername: '',
      accountStatus: '',
      passwordStatus: '',
    },
    {
      id: 202,
      name: 'GreenDelivery',
      manager: 'Tran Thi N',
      email: 'support@greendelivery.vn',
      phone: '0918 333 444',
      vehicleType: 'Xe tải nhẹ',
      licensePlate: '51D-678.90',
      requestDate: '2024-03-19',
      isLocked: false,
      accountCreated: true,
      accountUsername: 'greendelivery_partner',
      accountStatus: 'active',
      passwordStatus: 'active',
    },
    {
      id: 203,
      name: 'CityRunner',
      manager: 'Le Quoc H',
      email: 'hello@cityrunner.vn',
      phone: '0939 555 666',
      vehicleType: 'Xe máy',
      licensePlate: '43F1-246.80',
      requestDate: '2024-02-10',
      isLocked: true,
      accountCreated: false,
      accountUsername: '',
      accountStatus: '',
      passwordStatus: '',
    },
  ])

  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    manager: '',
    email: '',
    phone: '',
    vehicleType: '',
    licensePlate: '',
    requestDate: '',
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createForm, setCreateForm] = useState({
    deliveryId: '',
    manager: '',
    email: '',
    phone: '',
    vehicleType: '',
    licensePlate: '',
    password: '',
    confirmPassword: '',
    requestDate: getTodayDate(),
    passwordStatus: 'active',
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all') // all | pending | created
  const [lockFilter, setLockFilter] = useState('all') // all | locked | unlocked

  const pendingDeliveries = deliveryPartners.filter((delivery) => !delivery.accountCreated)

  const vehicleTypes = Array.from(
    new Set(deliveryPartners.map((d) => d.vehicleType).filter(Boolean)),
  )

  const filteredDeliveries = deliveryPartners.filter((delivery) => {
    const q = searchQuery.trim().toLowerCase()

    const matchesSearch =
      !q ||
      delivery.name.toLowerCase().includes(q) ||
      delivery.manager.toLowerCase().includes(q) ||
      delivery.email.toLowerCase().includes(q) ||
      delivery.phone.toLowerCase().includes(q) ||
      delivery.licensePlate.toLowerCase().includes(q)

    const matchesVehicleType = vehicleTypeFilter === 'all' || delivery.vehicleType === vehicleTypeFilter

    const matchesAccount =
      accountFilter === 'all' ||
      (accountFilter === 'pending' && !delivery.accountCreated) ||
      (accountFilter === 'created' && delivery.accountCreated)

    const matchesLock =
      lockFilter === 'all' ||
      (lockFilter === 'locked' && delivery.isLocked) ||
      (lockFilter === 'unlocked' && !delivery.isLocked)

    return matchesSearch && matchesVehicleType && matchesAccount && matchesLock
  })

  const totalCount = deliveryPartners.length
  const pendingCount = pendingDeliveries.length
  const createdCount = deliveryPartners.filter((d) => d.accountCreated).length
  const lockedCount = deliveryPartners.filter((d) => d.isLocked).length

  function handleToggleLockDelivery(id) {
    setDeliveryPartners((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isLocked: !item.isLocked,
            }
          : item
      )
    )

    setSelectedDelivery((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            isLocked: !prev.isLocked,
          }
        : prev
    )
  }

  function handleDeleteDelivery(id) {
    const delivery = deliveryPartners.find((item) => item.id === id)
    if (!delivery) {
      return
    }

    const confirmed = window.confirm(`Xóa đối tác ${delivery.name}?`)
    if (!confirmed) {
      return
    }

    setDeliveryPartners((prev) => prev.filter((item) => item.id !== id))

    if (selectedDelivery && selectedDelivery.id === id) {
      closeDetail()
    }
  }

  function handleCreateAccount(delivery) {
    const isLockedByStatus = createForm.passwordStatus === 'locked'

    setDeliveryPartners((prev) =>
      prev.map((item) =>
        item.id === delivery.id
          ? {
              ...item,
              manager: createForm.manager.trim(),
              email: createForm.email.trim(),
              phone: createForm.phone.trim(),
              vehicleType: createForm.vehicleType.trim(),
              licensePlate: createForm.licensePlate.trim(),
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

    setSelectedDelivery((prev) =>
      prev && prev.id === delivery.id
        ? {
            ...prev,
            manager: createForm.manager.trim(),
            email: createForm.email.trim(),
            phone: createForm.phone.trim(),
            vehicleType: createForm.vehicleType.trim(),
            licensePlate: createForm.licensePlate.trim(),
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

  function resetCreateForm(deliveryId = '') {
    setCreateForm({
      deliveryId: deliveryId ? String(deliveryId) : '',
      manager: '',
      email: '',
      phone: '',
      vehicleType: '',
      licensePlate: '',
      password: '',
      confirmPassword: '',
      requestDate: getTodayDate(),
      passwordStatus: 'active',
    })
    setCreateError('')
    setCreateSuccess('')
  }

  function openCreateModal() {
    const deliveryId = pendingDeliveries[0]?.id

    if (!deliveryId) {
      window.alert('Không còn đối tác delivery nào cần tạo tài khoản.')
      return
    }

    resetCreateForm(deliveryId)
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

    const selectedId = Number(createForm.deliveryId)
    const delivery = deliveryPartners.find((item) => item.id === selectedId)

    if (!delivery || delivery.accountCreated) {
      setCreateError('Đối tác delivery đã có tài khoản hoặc không hợp lệ.')
      return
    }

    if (!createForm.manager.trim()) {
      setCreateError('Người phụ trách không được để trống.')
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

    if (!createForm.vehicleType.trim()) {
      setCreateError('Loại phương tiện không được để trống.')
      return
    }

    if (!createForm.licensePlate.trim()) {
      setCreateError('Biển số xe không được để trống.')
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

    handleCreateAccount(delivery)
    setCreateSuccess(`Đã tạo tài khoản thành công cho ${delivery.name}.`)

    setTimeout(() => {
      closeCreateModal()
    }, 600)
  }

  function openDetail(delivery) {
    setSelectedDelivery(delivery)
    setEditForm({
      name: delivery.name,
      manager: delivery.manager,
      email: delivery.email,
      phone: delivery.phone,
      vehicleType: delivery.vehicleType,
      licensePlate: delivery.licensePlate,
      requestDate: delivery.requestDate,
    })
    setEditError('')
    setEditSuccess('')
    setShowDetailModal(true)
  }

  function closeDetail() {
    setShowDetailModal(false)
    setSelectedDelivery(null)
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

  function submitEditDelivery(event) {
    event.preventDefault()

    if (!selectedDelivery) {
      return
    }

    if (!editForm.name.trim()) {
      setEditError('Tên đối tác không được để trống.')
      return
    }

    if (!editForm.manager.trim()) {
      setEditError('Người phụ trách không được để trống.')
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

    if (!editForm.vehicleType.trim()) {
      setEditError('Loại phương tiện không được để trống.')
      return
    }

    if (!editForm.licensePlate.trim()) {
      setEditError('Biển số xe không được để trống.')
      return
    }

    if (!editForm.requestDate) {
      setEditError('Ngày đăng ký không được để trống.')
      return
    }

    const nextData = {
      name: editForm.name.trim(),
      manager: editForm.manager.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      vehicleType: editForm.vehicleType.trim(),
      licensePlate: editForm.licensePlate.trim(),
      requestDate: editForm.requestDate,
    }

    setDeliveryPartners((prev) =>
      prev.map((item) =>
        item.id === selectedDelivery.id
          ? {
              ...item,
              ...nextData,
            }
          : item
      )
    )

    setSelectedDelivery((prev) =>
      prev
        ? {
            ...prev,
            ...nextData,
          }
        : prev
    )

    setEditSuccess('Đã cập nhật thông tin đối tác delivery.')
  }

  return (
    <SystemAdminLayout>
      <div className="delivery-page">
        {/* TOOLBAR */}
        <div className="delivery-toolbar">
          <div className="delivery-toolbar-left">
            <button
              className="delivery-btn-create delivery-toolbar-btn"
              onClick={openCreateModal}
              disabled={pendingDeliveries.length === 0}
            >
              Tạo tài khoản
            </button>
          </div>

          <div className="delivery-toolbar-filters">
            <input
              className="delivery-filter-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên/email/sđt/biển số..."
              aria-label="Tìm kiếm đối tác delivery"
            />

            <select
              className="delivery-filter-select"
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              aria-label="Lọc theo phương tiện"
            >
              <option value="all">Tất cả phương tiện</option>
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="delivery-filter-select"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              aria-label="Lọc theo tài khoản"
            >
              <option value="all">Tất cả tài khoản</option>
              <option value="pending">Chưa tạo tài khoản</option>
              <option value="created">Đã tạo tài khoản</option>
            </select>

            <select
              className="delivery-filter-select"
              value={lockFilter}
              onChange={(e) => setLockFilter(e.target.value)}
              aria-label="Lọc theo khóa/mở khóa"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="locked">Đang bị khóa</option>
              <option value="unlocked">Đang hoạt động</option>
            </select>
          </div>

          <div className="delivery-toolbar-info">
            Hiển thị {filteredDeliveries.length}/{totalCount}
          </div>
        </div>

        {/* SUMMARY */}
        <div className="delivery-summary">
          <div className="delivery-summary-card">
            <div className="delivery-summary-title">Tổng</div>
            <div className="delivery-summary-value">{totalCount}</div>
          </div>
          <div className="delivery-summary-card delivery-summary-card-pending">
            <div className="delivery-summary-title">Chưa tạo tài khoản</div>
            <div className="delivery-summary-value">{pendingCount}</div>
          </div>
          <div className="delivery-summary-card delivery-summary-card-created">
            <div className="delivery-summary-title">Đã tạo tài khoản</div>
            <div className="delivery-summary-value">{createdCount}</div>
          </div>
          <div className="delivery-summary-card delivery-summary-card-locked">
            <div className="delivery-summary-title">Đang bị khóa</div>
            <div className="delivery-summary-value">{lockedCount}</div>
          </div>
        </div>

        {/* TABLE */}
        <div className="delivery-card">
          <div className="table-responsive">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>Tên Đối Tác</th>
                  <th>Người Phụ Trách</th>
                  <th>Email</th>
                  <th>Điện Thoại</th>
                  <th>Phương Tiện</th>
                  <th>Biển Số Xe</th>
                  <th>Ngày Đăng Ký</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.length > 0 ? (
                  filteredDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>
                        <div className="delivery-name">{delivery.name}</div>
                      </td>
                      <td>{delivery.manager}</td>
                      <td>
                        <a href={`mailto:${delivery.email}`}>{delivery.email}</a>
                      </td>
                      <td>{delivery.phone}</td>
                      <td>{delivery.vehicleType}</td>
                      <td>{delivery.licensePlate}</td>
                      <td>{new Date(delivery.requestDate).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div className="action-group">
                          <button
                            className="action-btn icon-action-btn btn-edit"
                            onClick={() => openDetail(delivery)}
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" />
                            </svg>
                          </button>
                          <button
                            className={`action-btn icon-action-btn ${delivery.isLocked ? 'btn-unlock-small' : 'btn-lock-small'}`}
                            onClick={() => handleToggleLockDelivery(delivery.id)}
                            title={delivery.isLocked ? 'Mở khóa đối tác' : 'Khóa đối tác'}
                            aria-label={delivery.isLocked ? 'Mở khóa đối tác' : 'Khóa đối tác'}
                          >
                            {delivery.isLocked ? (
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
                            onClick={() => handleDeleteDelivery(delivery.id)}
                            title="Xóa đối tác"
                            aria-label="Xóa đối tác"
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
                    <td colSpan="8" className="empty-cell">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL MODAL */}
        {showDetailModal && selectedDelivery && (
          <div className="delivery-modal-overlay" onClick={closeDetail}>
            <div className="delivery-modal delivery-edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chỉnh Sửa Đối Tác Giao Hàng</h3>
                <button className="modal-close" onClick={closeDetail}>✕</button>
              </div>
              <form className="modal-body delivery-edit-form" onSubmit={submitEditDelivery}>
                <div className="create-form-grid">
                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Tên Đối Tác</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditFormChange}
                        className="delivery-input"
                        placeholder="Nhập tên đối tác"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Người Phụ Trách</label>
                      <input
                        type="text"
                        name="manager"
                        value={editForm.manager}
                        onChange={handleEditFormChange}
                        className="delivery-input"
                        placeholder="Nhập tên người phụ trách"
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
                        className="delivery-input"
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
                        className="delivery-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Loại Phương Tiện</label>
                      <input
                        type="text"
                        name="vehicleType"
                        value={editForm.vehicleType}
                        onChange={handleEditFormChange}
                        className="delivery-input"
                        placeholder="Ví dụ: Xe máy, Xe tải nhẹ"
                        required
                      />
                    </div>
                    <div className="create-form-field">
                      <label>Biển Số Xe</label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={editForm.licensePlate}
                        onChange={handleEditFormChange}
                        className="delivery-input"
                        placeholder="Ví dụ: 59X3-123.45"
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
                        className="delivery-input"
                        required
                      />
                    </div>
                  </div>
                </div>

                {editError && <p className="delivery-error">{editError}</p>}
                {editSuccess && <p className="delivery-success">{editSuccess}</p>}

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large delivery-btn-create">
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
          <div className="delivery-modal-overlay" onClick={closeCreateModal}>
            <div className="delivery-modal delivery-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Tạo Tài khoản Đối Tác Giao Hàng</h3>
                <button className="modal-close" onClick={closeCreateModal}>✕</button>
              </div>

              <form className="modal-body delivery-create-form" onSubmit={submitCreateAccount}>
                <div className="create-form-grid">
                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Người Phụ Trách</label>
                      <input
                        type="text"
                        name="manager"
                        value={createForm.manager}
                        onChange={handleCreateFormChange}
                        className="delivery-input"
                        placeholder="Nhập tên người phụ trách"
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
                        className="delivery-input"
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
                        className="delivery-input"
                        placeholder="Nhập số điện thoại"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Loại Phương Tiện</label>
                      <input
                        type="text"
                        name="vehicleType"
                        value={createForm.vehicleType}
                        onChange={handleCreateFormChange}
                        className="delivery-input"
                        placeholder="Ví dụ: Xe máy, Xe tải nhẹ"
                        required
                      />
                    </div>
                  </div>

                  <div className="create-form-column">
                    <div className="create-form-field">
                      <label>Biển Số Xe</label>
                      <input
                        type="text"
                        name="licensePlate"
                        value={createForm.licensePlate}
                        onChange={handleCreateFormChange}
                        className="delivery-input"
                        placeholder="Ví dụ: 59X3-123.45"
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
                        className="delivery-input"
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
                        className="delivery-input"
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
                        className="delivery-input"
                        required
                      />
                    </div>

                    <div className="create-form-field">
                      <label>Trạng Thái Hoạt Động</label>
                      <select
                        name="passwordStatus"
                        value={createForm.passwordStatus}
                        onChange={handleCreateFormChange}
                        className="delivery-input"
                      >
                        <option value="active">Đang hoạt động</option>
                        <option value="locked">Bị khóa</option>
                      </select>
                    </div>
                  </div>
                </div>

                {createError && <p className="delivery-error">{createError}</p>}
                {createSuccess && <p className="delivery-success">{createSuccess}</p>}

                <div className="create-form-footer">
                  <div className="create-form-actions">
                    <button type="submit" className="btn-large delivery-btn-create">
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
