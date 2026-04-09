import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchInventoryLots,
  createInventoryLot,
  updateInventoryLot,
  deleteInventoryLot,
  importInventoryLots,
} from '../../services/staffApi'
import './InventoryLots.css'

const statusColors = {
  'Moi': 'badge-new',
  'Sap Het Han': 'badge-warning',
  'Het Han': 'badge-danger',
}

const badgeTextMap = {
  'Moi': 'Mới',
  'Sap Het Han': 'Sắp Hết Hạn',
  'Het Han': 'Hết Hạn',
}

const lotStatusOptions = ['Moi', 'Sap Het Han', 'Het Han']

function getStatusLabel(status) {
  if (status === 'Moi') return 'Mới'
  if (status === 'Sap Het Han') return 'Sắp Hết Hạn'
  if (status === 'Het Han') return 'Hết Hạn'
  return status
}

export default function InventoryLots() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedLot, setSelectedLot] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const [editForm, setEditForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    expiryDate: '',
  })

  const [createForm, setCreateForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    expiryDate: '',
    status: 'Moi',
    actionNote: '',
  })

  useEffect(() => {
    loadLots()
  }, [])

  async function loadLots() {
    try {
      setLoading(true)
      const data = await fetchInventoryLots()
      setLots(data)
    } catch (err) {
      console.error('Failed to load inventory lots:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLots = statusFilter === 'all'
    ? lots
    : lots.filter((lot) => lot.status === statusFilter)

  async function handleDeleteLot(id) {
    const lot = lots.find((item) => item.id === id)
    if (!lot) return

    const confirmed = window.confirm(`Xóa lô hàng ${lot.lotCode}?`)
    if (!confirmed) return

    try {
      await deleteInventoryLot(id)
      setLots((prev) => prev.filter((item) => item.id !== id))
      if (selectedLot?.id === id) {
        setSelectedLot(null)
      }
    } catch (err) {
      console.error('Failed to delete lot:', err)
      alert('Xóa lô hàng thất bại')
    }
  }

  function openEditModal(lot) {
    setSelectedLot(lot)
    setEditForm({
      lotCode: lot.lotCode,
      productName: lot.productName,
      quantity: String(lot.quantity),
      expiryDate: lot.expiryDate,
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

  async function submitEditLot(event) {
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

    try {
      setIsSubmitting(true)
      await updateInventoryLot(selectedLot.id, {
        lotCode: editForm.lotCode.trim(),
        productName: editForm.productName.trim(),
        quantity: Number(editForm.quantity),
        expiryDate: editForm.expiryDate,
      })

      setLots((prev) =>
        prev.map((item) =>
          item.id === selectedLot.id
            ? {
                ...item,
                lotCode: editForm.lotCode.trim(),
                productName: editForm.productName.trim(),
                quantity: Number(editForm.quantity),
                expiryDate: editForm.expiryDate,
              }
            : item
        )
      )
      setEditSuccess('Đã cập nhật thông tin lô hàng.')
      setTimeout(() => closeEditModal(), 600)
    } catch (err) {
      console.error('Failed to update lot:', err)
      setEditError(err?.response?.data?.detail || 'Cập nhật lô hàng thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetCreateForm() {
    setCreateForm({
      lotCode: '',
      productName: '',
      quantity: '',
      expiryDate: '',
      status: 'Moi',
      actionNote: '',
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

  async function submitCreateLot(event) {
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

    try {
      setIsSubmitting(true)
      const response = await createInventoryLot({
        lotCode: createForm.lotCode.trim(),
        productName: createForm.productName.trim(),
        quantity: Number(createForm.quantity),
        expiryDate: createForm.expiryDate,
        status: createForm.status,
        actionNote: createForm.actionNote.trim(),
      })
      await loadLots()
      const actionNoteMessage = response?.actionNote
        ? ` (Thao tác: ${response.actionNote})`
        : ''
      setCreateSuccess(`Đã tạo lô hàng mới thành công.${actionNoteMessage}`)
      setTimeout(() => closeCreateModal(), 600)
    } catch (err) {
      console.error('Failed to create lot:', err)
      setCreateError(err?.response?.data?.detail || 'Tạo lô hàng thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleImportFile(event) {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      setImportError('Chỉ hỗ trợ file .xlsx hoặc .csv')
      setImportResult('')
      return
    }

    try {
      setIsImporting(true)
      setImportError('')
      setImportResult('')

      const result = await importInventoryLots(selectedFile)
      await loadLots()

      let message = `Import thành công: tạo mới ${result.created || 0}, cập nhật ${result.updated || 0}`
      if (typeof result.productsCreated !== 'undefined' || typeof result.productsUpdated !== 'undefined') {
        message += ` | sản phẩm tạo mới ${result.productsCreated || 0}, cập nhật ${result.productsUpdated || 0}`
      }
      if (result.failed) {
        const firstError = result.errors?.[0]
        const detail = firstError
          ? ` Dòng lỗi đầu tiên: ${firstError.row} - ${firstError.message}`
          : ''
        message += `. Lỗi ${result.failed}.${detail}`
      }
      setImportResult(message)
    } catch (err) {
      setImportError(err?.response?.data?.detail || 'Import file thất bại.')
    } finally {
      setIsImporting(false)
    }
  }

  if (loading) {
    return (
      <StaffLayout>
        <div className="inventory-page">
          <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải dữ liệu...</div>
        </div>
      </StaffLayout>
    )
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
            <option value="Moi">Mới</option>
            <option value="Sap Het Han">Sắp Hết Hạn</option>
            <option value="Het Han">Hết Hạn</option>
          </select>
        </div>
        <div className="inventory-toolbar-actions">
          <label className={`inventory-upload-btn ${isImporting ? 'is-disabled' : ''}`}>
            {isImporting ? 'Đang import...' : 'Upload Excel/CSV'}
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleImportFile}
              disabled={isImporting}
              hidden
            />
          </label>
          <button className="inventory-btn-create inventory-toolbar-btn" onClick={openCreateModal}>
            Tạo Lô Mới
          </button>
        </div>
        <div className="inventory-toolbar-info">
          Hiển thị {filteredLots.length} lô hàng
        </div>
      </div>

      {importError && <p className="inventory-error">{importError}</p>}
      {importResult && <p className="inventory-success">{importResult}</p>}

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
                        {getStatusLabel(lot.status)}
                      </span>
                    </td>
                    <td>
                      <div className="inventory-actions">
                        <button
                          className="inventory-btn-edit"
                          onClick={() => openEditModal(lot)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                          Sửa
                        </button>
                        <button
                          className="inventory-btn-delete"
                          onClick={() => handleDeleteLot(lot.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
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
                      placeholder="VD: LOT-001"
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
                      value={createForm.status}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                    >
                      {lotStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="inventory-form-field">
                    <label>Thao Tác</label>
                    <input
                      type="text"
                      name="actionNote"
                      value={createForm.actionNote}
                      onChange={handleCreateFormChange}
                      className="inventory-input"
                      placeholder="VD: Ưu tiên nhập kho"
                    />
                  </div>
                </div>
              </div>

              {editError && <p className="inventory-error">{editError}</p>}
              {editSuccess && <p className="inventory-success">{editSuccess}</p>}

              <div className="inventory-form-footer">
                <div className="inventory-form-actions">
                  <button type="submit" className="btn-large inventory-btn-create" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
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
                      placeholder="VD: LOT-001"
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
                </div>
              </div>

              {createError && <p className="inventory-error">{createError}</p>}
              {createSuccess && <p className="inventory-success">{createSuccess}</p>}

              <div className="inventory-form-footer">
                <div className="inventory-form-actions">
                  <button type="submit" className="btn-large inventory-btn-create" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Lô Mới'}
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
