import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import {
  createAdminDeliveryAccount,
  createAdminDeliveryWithAccount,
  deleteAdminDeliveryPartner,
  fetchAdminDeliveryPartners,
  toggleAdminDeliveryLock,
  updateAdminDeliveryPartner,
} from '../../services/adminApi'
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

  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editForm, setEditForm] = useState({
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
    manager: '',
    email: '',
    phone: '',
    vehicleType: '',
    licensePlate: '',
    password: '',
    confirmPassword: '',
    requestDate: getTodayDate(),
    activityStatus: 'active',
  })

  async function loadDeliveries() {
    try {
      setError('')
      const items = await fetchAdminDeliveryPartners()
      setDeliveryPartners(items)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể tải danh sách đối tác giao hàng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
  }, [])

  const filteredDeliveries = deliveryPartners

  async function handleToggleLockDelivery(id) {
    try {
      await toggleAdminDeliveryLock(id)
      await loadDeliveries()
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể khóa/mở khóa đối tác giao hàng.')
    }
  }

  async function handleDeleteDelivery(id) {
    const delivery = deliveryPartners.find((item) => item.id === id)
    if (!delivery) {
      return
    }

    const confirmed = window.confirm(`Xóa đối tác ${delivery.name}?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteAdminDeliveryPartner(id)
      await loadDeliveries()
      if (selectedDelivery && selectedDelivery.id === id) {
        closeDetail()
      }
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa đối tác giao hàng.')
    }
  }

  function resetCreateForm() {
    setCreateForm({
      manager: '',
      email: '',
      phone: '',
      vehicleType: '',
      licensePlate: '',
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

    try {
      const payload = {
        manager: createForm.manager.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        vehicleType: createForm.vehicleType.trim(),
        licensePlate: createForm.licensePlate.trim(),
        password: createForm.password,
        activityStatus: createForm.activityStatus,
      }

      await createAdminDeliveryWithAccount(payload)
      setCreateSuccess(`Đã tạo tài khoản thành công cho ${payload.manager}.`)
      await loadDeliveries()
    } catch (err) {
      setCreateError(err?.response?.data?.detail || 'Không thể tạo tài khoản đối tác giao hàng.')
      return
    }

    setTimeout(() => {
      closeCreateModal()
    }, 600)
  }

  function openDetail(delivery) {
    setSelectedDelivery(delivery)
    setEditForm({
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

  async function submitEditDelivery(event) {
    event.preventDefault()

    if (!selectedDelivery) {
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
      manager: editForm.manager.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      vehicleType: editForm.vehicleType.trim(),
      licensePlate: editForm.licensePlate.trim(),
      requestDate: editForm.requestDate,
    }

    try {
      await updateAdminDeliveryPartner(selectedDelivery.id, nextData)
      setEditSuccess('Đã cập nhật thông tin đối tác delivery.')
      await loadDeliveries()
    } catch (err) {
      setEditError(err?.response?.data?.detail || 'Không thể cập nhật đối tác delivery.')
    }
  }

  return (
    <SystemAdminLayout>
      <div className="delivery-page">
        {/* TOOLBAR */}
        <div className="delivery-toolbar">
          <button
            className="delivery-btn-create delivery-toolbar-btn"
            onClick={openCreateModal}
          >
            Tạo tài khoản
          </button>
          <div className="delivery-toolbar-info">
            Hiển thị {filteredDeliveries.length} đối tác giao hàng
          </div>
        </div>

        {/* TABLE */}
        <div className="delivery-card">
          {loading && <div className="empty-cell">Đang tải dữ liệu...</div>}
          {error && <div className="empty-cell">{error}</div>}
          <div className="table-responsive">
            <table className="delivery-table">
              <thead>
                <tr>
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
                      <td>{delivery.manager}</td>
                      <td>
                        <a href={`mailto:${delivery.email}`}>{delivery.email}</a>
                      </td>
                      <td>{delivery.phone}</td>
                      <td>{delivery.vehicleType}</td>
                      <td>{delivery.licensePlate}</td>
                      <td>{new Date(delivery.requestDate).toLocaleDateString('vi-VN')}</td>
                      <td className="delivery-actions-cell">
                        <div className="delivery-actions">
                          <button
                            className="delivery-btn-edit"
                            onClick={() => openDetail(delivery)}
                            title="Chỉnh sửa"
                          >
                            <svg className="delivery-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z"/>
                            </svg>
                            Sửa
                          </button>
                          <button
                            className={`delivery-btn-lock ${delivery.isLocked ? 'delivery-btn-unlock' : 'delivery-btn-lock-active'}`}
                            onClick={() => handleToggleLockDelivery(delivery.id)}
                            title={delivery.isLocked ? 'Mở khóa đối tác' : 'Khóa đối tác'}
                          >
                            {delivery.isLocked ? (
                              <>
                                <svg className="delivery-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-7V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z"/>
                                </svg>
                                Mở khóa
                              </>
                            ) : (
                              <>
                                <svg className="delivery-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z"/>
                                </svg>
                                Khóa
                              </>
                            )}
                          </button>
                          <button
                            className="delivery-btn-delete"
                            onClick={() => handleDeleteDelivery(delivery.id)}
                            title="Xóa đối tác"
                          >
                            <svg className="delivery-btn-icon" viewBox="0 0 24 24" fill="currentColor">
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
                    <td colSpan="8" className="empty-cell">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT MODAL */}
        {showDetailModal && selectedDelivery && (
          <div className="delivery-modal-overlay" onClick={closeDetail}>
            <div className="delivery-modal delivery-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delivery-modal-header">
                <h3>Chỉnh Sửa Đối Tác Giao Hàng</h3>
                <button className="delivery-modal-close" onClick={closeDetail}>×</button>
              </div>
              <form onSubmit={submitEditDelivery}>
                <div className="delivery-modal-body">
                  <div className="delivery-create-grid">
                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                  {editError && <p className="delivery-error">{editError}</p>}
                  {editSuccess && <p className="delivery-success">{editSuccess}</p>}
                </div>

                <div className="delivery-modal-footer">
                  <button type="submit" className="delivery-btn-create">
                    Lưu Thay Đổi
                  </button>
                  <button type="button" className="delivery-btn-cancel" onClick={closeDetail}>
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="delivery-modal-overlay" onClick={closeCreateModal}>
            <div className="delivery-modal delivery-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delivery-modal-header">
                <h3>Tạo Tài Khoản Đối Tác Giao Hàng</h3>
                <button className="delivery-modal-close" onClick={closeCreateModal}>×</button>
              </div>
              <form onSubmit={submitCreateAccount}>
                <div className="delivery-modal-body">
                  <div className="delivery-create-grid">
                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
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

                    <div className="delivery-form-field">
                      <label>Trạng Thái Hoạt Động</label>
                      <select
                        name="activityStatus"
                        value={createForm.activityStatus}
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

                <div className="delivery-modal-footer">
                  <button type="submit" className="delivery-btn-create">
                    Tạo Mới
                  </button>
                  <button type="button" className="delivery-btn-cancel" onClick={closeCreateModal}>
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
