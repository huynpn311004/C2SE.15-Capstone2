import { useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './InventoryLots.css'

const statusColors = {
  'Mới': 'badge-new',
  'Sắp Hết Hạn': 'badge-warning',
  'Hết Hạn': 'badge-danger',
}

const badgeTextMap = {
  'Mới': 'Mới',
  'Sắp Hết Hạn': 'Sắp Hết Hạn',
  'Hết Hạn': 'Hết Hạn',
}

export default function InventoryLots() {
  const [lots, setLots] = useState([
    { id: 1, lotCode: 'LH-001', productName: 'Sữa Chua Hy Lạp', quantity: 80, expiryDate: '2026-04-10', status: 'Sắp Hết Hạn' },
    { id: 2, lotCode: 'LH-002', productName: 'Nước Cam', quantity: 120, expiryDate: '2026-06-01', status: 'Mới' },
    { id: 3, lotCode: 'LH-003', productName: 'Bánh Mì Tươi', quantity: 32, expiryDate: '2026-03-26', status: 'Hết Hạn' },
  ])

  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedLot, setSelectedLot] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [editForm, setEditForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    expiryDate: '',
    status: 'Mới',
  })

  const [createForm, setCreateForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    expiryDate: '',
    status: 'Mới',
  })

  const filteredLots = statusFilter === 'all'
    ? lots
    : lots.filter((lot) => lot.status === statusFilter)

  function handleDeleteLot(id) {
    const lot = lots.find((item) => item.id === id)
    if (!lot) return

    const confirmed = window.confirm(`Xóa lô hàng ${lot.lotCode}?`)
    if (!confirmed) return

    setLots((prev) => prev.filter((item) => item.id !== id))
    if (selectedLot?.id === id) {
      setSelectedLot(null)
    }
  }

  function openEditModal(lot) {
    setSelectedLot(lot)
    setEditForm({
      lotCode: lot.lotCode,
      productName: lot.productName,
      quantity: String(lot.quantity),
      expiryDate: lot.expiryDate,
      status: lot.status,
    })
    setEditError('')
    setEditSuccess('')
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setSelectedLot(null)
    setEditError('')
    setEditSuccess('')
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    setEditError('')
    setEditSuccess('')
  }

  function submitEditLot(event) {
    event.preventDefault()
    setEditError('')
    setEditSuccess('')

    if (!editForm.lotCode.trim()) {
      setEditError('Mã lô không được để trống.')
      return
    }
    if (!editForm.productName.trim()) {
      setEditError('Tên sản phẩm không được để trống.')
      return
    }
    if (!editForm.quantity.trim() || isNaN(Number(editForm.quantity)) || Number(editForm.quantity) < 0) {
      setEditError('Số lượng phải là số không âm.')
      return
    }
    if (!editForm.expiryDate) {
      setEditError('Ngày hết hạn không được để trống.')
      return
    }

    const updated = {
      lotCode: editForm.lotCode.trim(),
      productName: editForm.productName.trim(),
      quantity: Number(editForm.quantity),
      expiryDate: editForm.expiryDate,
      status: editForm.status,
    }

    setLots((prev) =>
      prev.map((item) => (item.id === selectedLot.id ? { ...item, ...updated } : item))
    )
    setSelectedLot((prev) => prev ? { ...prev, ...updated } : prev)
    setEditSuccess('Đã cập nhật thông tin lô hàng.')
  }

  function resetCreateForm() {
    setCreateForm({
      lotCode: '',
      productName: '',
      quantity: '',
      expiryDate: '',
      status: 'Mới',
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
    setCreateForm((prev) => ({ ...prev, [name]: value }))
    setCreateError('')
    setCreateSuccess('')
  }

  function submitCreateLot(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.lotCode.trim()) {
      setCreateError('Mã lô không được để trống.')
      return
    }
    if (!createForm.productName.trim()) {
      setCreateError('Tên sản phẩm không được để trống.')
      return
    }
    if (!createForm.quantity.trim() || isNaN(Number(createForm.quantity)) || Number(createForm.quantity) < 0) {
      setCreateError('Số lượng phải là số không âm.')
      return
    }
    if (!createForm.expiryDate) {
      setCreateError('Ngày hết hạn không được để trống.')
      return
    }

    const newLot = {
      id: Date.now(),
      lotCode: createForm.lotCode.trim(),
      productName: createForm.productName.trim(),
      quantity: Number(createForm.quantity),
      expiryDate: createForm.expiryDate,
      status: createForm.status,
    }

    setLots((prev) => [...prev, newLot])
    setCreateSuccess('Đã tạo lô hàng mới thành công.')

    setTimeout(() => {
      closeCreateModal()
    }, 600)
  }

  return (
    <StaffLayout>
      <div className="inventory-page">
      {/* TOOLBAR */}
      <div className="inventory-toolbar">
        <div className="inventory-filter-group">
          <label>Lọc theo trạng thái:</label>
          <select
            className="inventory-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất Cả</option>
            <option value="Mới">Mới</option>
            <option value="Sắp Hết Hạn">Sắp Hết Hạn</option>
            <option value="Hết Hạn">Hết Hạn</option>
          </select>
        </div>
        <button className="inventory-btn-create inventory-toolbar-btn" onClick={openCreateModal}>
          + Tạo Lô Mới
        </button>
        <div className="inventory-toolbar-info">
          Hiển thị {filteredLots.length} lô hàng
        </div>
      </div>

      {/* TABLE */}
      <div className="inventory-card">
        <div className="table-responsive">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Mã Lô</th>
                <th>Tên Sản Phẩm</th>
                <th>Số Lượng</th>
                <th>Ngày Hết Hạn</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.length > 0 ? (
                filteredLots.map((lot) => (
                  <tr key={lot.id}>
                    <td>
                      <span className="lot-code">{lot.lotCode}</span>
                    </td>
                    <td>{lot.productName}</td>
                    <td>{lot.quantity}</td>
                    <td>{new Date(lot.expiryDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`badge ${statusColors[lot.status]}`}>
                        {badgeTextMap[lot.status]}
                      </span>
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          className="action-btn icon-action-btn btn-edit"
                          onClick={() => openEditModal(lot)}
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" />
                          </svg>
                        </button>
                        <button
                          className="action-btn icon-action-btn btn-delete-small"
                          onClick={() => handleDeleteLot(lot.id)}
                          title="Xóa lô hàng"
                          aria-label="Xóa lô hàng"
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

      {/* EDIT MODAL */}
      {showEditModal && selectedLot && (
        <div className="inventory-modal-overlay" onClick={closeEditModal}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh Sửa Lô Hàng</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            <form className="modal-body" onSubmit={submitEditLot}>
              <div className="inventory-form-grid">
                <div className="inventory-form-column">
                  <div className="inventory-form-field">
                    <label>Mã Lô</label>
                    <input
                      type="text"
                      name="lotCode"
                      value={editForm.lotCode}
                      onChange={handleEditFormChange}
                      className="inventory-input"
                      placeholder="Nhập mã lô"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Tên Sản Phẩm</label>
                    <input
                      type="text"
                      name="productName"
                      value={editForm.productName}
                      onChange={handleEditFormChange}
                      className="inventory-input"
                      placeholder="Nhập tên sản phẩm"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Số Lượng</label>
                    <input
                      type="number"
                      name="quantity"
                      value={editForm.quantity}
                      onChange={handleEditFormChange}
                      className="inventory-input"
                      placeholder="Nhập số lượng"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="inventory-form-column">
                  <div className="inventory-form-field">
                    <label>Ngày Hết Hạn</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={editForm.expiryDate}
                      onChange={handleEditFormChange}
                      className="inventory-input"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Trạng Thái</label>
                    <select
                      name="status"
                      value={editForm.status}
                      onChange={handleEditFormChange}
                      className="inventory-input"
                    >
                      <option value="Mới">Mới</option>
                      <option value="Sắp Hết Hạn">Sắp Hết Hạn</option>
                      <option value="Hết Hạn">Hết Hạn</option>
                    </select>
                  </div>
                </div>
              </div>

              {editError && <p className="inventory-error">{editError}</p>}
              {editSuccess && <p className="inventory-success">{editSuccess}</p>}

              <div className="inventory-form-footer">
                <div className="inventory-form-actions">
                  <button type="submit" className="btn-large inventory-btn-create">
                    Lưu Thay Đổi
                  </button>
                  <button type="button" className="btn-large btn-close" onClick={closeEditModal}>
                    Hủy
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="inventory-modal-overlay" onClick={closeCreateModal}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo Lô Hàng Mới</h3>
              <button className="modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form className="modal-body" onSubmit={submitCreateLot}>
              <div className="inventory-form-grid">
                <div className="inventory-form-column">
                  <div className="inventory-form-field">
                    <label>Mã Lô</label>
                    <input
                      type="text"
                      name="lotCode"
                      value={createForm.lotCode}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                      placeholder="Nhập mã lô"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Tên Sản Phẩm</label>
                    <input
                      type="text"
                      name="productName"
                      value={createForm.productName}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                      placeholder="Nhập tên sản phẩm"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Số Lượng</label>
                    <input
                      type="number"
                      name="quantity"
                      value={createForm.quantity}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                      placeholder="Nhập số lượng"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="inventory-form-column">
                  <div className="inventory-form-field">
                    <label>Ngày Hết Hạn</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={createForm.expiryDate}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                      required
                    />
                  </div>
                  <div className="inventory-form-field">
                    <label>Trạng Thái</label>
                    <select
                      name="status"
                      value={createForm.status}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                    >
                      <option value="Mới">Mới</option>
                      <option value="Sắp Hết Hạn">Sắp Hết Hạn</option>
                      <option value="Hết Hạn">Hết Hạn</option>
                    </select>
                  </div>
                </div>
              </div>

              {createError && <p className="inventory-error">{createError}</p>}
              {createSuccess && <p className="inventory-success">{createSuccess}</p>}

              <div className="inventory-form-footer">
                <div className="inventory-form-actions">
                  <button type="submit" className="btn-large inventory-btn-create">
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
    </StaffLayout>
  )
}
