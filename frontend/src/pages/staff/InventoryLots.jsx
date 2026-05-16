import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchInventoryLots,
  createInventoryLot,
  updateInventoryLot,
  deleteInventoryLot,
  disposeInventoryLot,
  importInventoryLots,
} from '../../services/staffApi'
import './InventoryLots.css'

const statusColors = {
  'Moi': 'badge-new',
  'Sap Het Han': 'badge-warning',
  'Het Han': 'badge-danger',
  'disposed': 'badge-dark',
}

const badgeTextMap = {
  'Moi': 'Mới',
  'Sap Het Han': 'Sắp Hết Hạn',
  'Het Han': 'Hết Hạn',
  'disposed': 'Đã Tiêu Hủy',
}

const lotStatusOptions = ['Moi', 'Sap Het Han', 'Het Han']

function getStatusLabel(status) {
  if (status === 'Moi') return 'Mới'
  if (status === 'Sap Het Han') return 'Sắp Hết Hạn'
  if (status === 'Het Han') return 'Hết Hạn'
  if (status === 'disposed') return 'Đã Tiêu Hủy'
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const [showDisposeModal, setShowDisposeModal] = useState(false)
  const [disposeQty, setDisposeQty] = useState('')
  const [disposeReason, setDisposeReason] = useState('Hết hạn')

  const [editForm, setEditForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    manufacturingDate: '',
    expiryDate: '',
  })

  const [createForm, setCreateForm] = useState({
    lotCode: '',
    productName: '',
    quantity: '',
    manufacturingDate: '',
    expiryDate: '',
    status: 'Moi',
  })

  useEffect(() => {
    loadLots()
  }, [])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

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
      setSuccess('Xóa lô hàng thành công')
      if (selectedLot?.id === id) {
        setSelectedLot(null)
      }
    } catch (err) {
      console.error('Failed to delete lot:', err)
      setError('Xóa lô hàng thất bại.')
    }
  }

  function openEditModal(lot) {
    setSelectedLot(lot)
    setEditForm({
      lotCode: lot.lotCode,
      productName: lot.productName,
      quantity: String(lot.quantity),
      manufacturingDate: lot.manufacturingDate || '',
      expiryDate: lot.expiryDate,
    })
    setError('')
    setSuccess('')
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setSelectedLot(null)
    setError('')
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function submitEditLot(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!editForm.lotCode.trim()) {
      setError('Mã lô không được để trống.')
      return
    }
    if (!editForm.productName.trim()) {
      setError('Tên sản phẩm không được để trống.')
      return
    }
    if (!editForm.quantity.trim() || isNaN(Number(editForm.quantity)) || Number(editForm.quantity) < 0) {
      setError('Số lượng phải là số không âm.')
      return
    }
    if (!editForm.expiryDate) {
      setError('Ngày hết hạn không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      await updateInventoryLot(selectedLot.id, {
        lotCode: editForm.lotCode.trim(),
        productName: editForm.productName.trim(),
        quantity: Number(editForm.quantity),
        manufacturingDate: editForm.manufacturingDate || null,
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
              manufacturingDate: editForm.manufacturingDate || null,
              expiryDate: editForm.expiryDate,
            }
            : item
        )
      )
      setSuccess('Cập nhật lô hàng thành công')
      setTimeout(() => closeEditModal(), 1500)
    } catch (err) {
      console.error('Failed to update lot:', err)
      setError(err?.response?.data?.detail || 'Cập nhật lô hàng thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetCreateForm() {
    setCreateForm({
      lotCode: '',
      manufacturingDate: '',
      productName: '',
      quantity: '',
      expiryDate: '',
      status: 'Moi',
    })
    setError('')
    setSuccess('')
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
    setError('')
    setSuccess('')
  }

  async function submitCreateLot(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!createForm.lotCode.trim()) {
      setError('Mã lô không được để trống.')
      return
    }
    if (!createForm.productName.trim()) {
      setError('Tên sản phẩm không được để trống.')
      return
    }
    if (!createForm.quantity.trim() || isNaN(Number(createForm.quantity)) || Number(createForm.quantity) < 0) {
      setError('Số lượng phải là số không âm.')
      return
    }
    if (!createForm.expiryDate) {
      setError('Ngày hết hạn không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await createInventoryLot({
        lotCode: createForm.lotCode.trim(),
        productName: createForm.productName.trim(),
        manufacturingDate: createForm.manufacturingDate || null,
        quantity: Number(createForm.quantity),
        expiryDate: createForm.expiryDate,
        status: createForm.status,
      })
      await loadLots()
      setSuccess(`Tạo lô hàng mới thành công`)
      setTimeout(() => closeCreateModal(), 1500)
    } catch (err) {
      console.error('Failed to create lot:', err)
      setError(err?.response?.data?.detail || 'Tạo lô hàng thất bại.')
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
      setError('Chỉ hỗ trợ file .xlsx hoặc .csv')
      setSuccess('')
      return
    }

    try {
      setIsImporting(true)
      setError('')
      setSuccess('')

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
      setSuccess(message)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Import file thất bại.')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleDisposeLot(event) {
    event.preventDefault()
    if (!selectedLot) return

    const qty = Number(disposeQty)
    if (isNaN(qty) || qty <= 0) {
      setError('Số lượng hủy phải lớn hơn 0.')
      return
    }
    const currentAvailable = selectedLot.available ?? selectedLot.quantity
    if (qty > currentAvailable) {
      setError('Số lượng hủy không được vượt quá số lượng khả dụng.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await disposeInventoryLot(selectedLot.id, {
        quantity: qty,
        reason: disposeReason
      })
      
      setLots((prev) =>
        prev.map((item) =>
          item.id === selectedLot.id
            ? {
              ...item,
              quantity: res.newQtyOnHand,
              disposed: res.totalDisposed,
              available: Math.max(0, res.newQtyOnHand - (item.reserved || 0)),
              status: res.newQtyOnHand === 0 && (item.reserved || 0) === 0 ? 'disposed' : item.status
            }
            : item
        )
      )
      
      setSuccess(`Đã tiêu hủy ${qty} sản phẩm thành công.`)
      setShowDisposeModal(false)
      setDisposeQty('')
      setDisposeReason('Hết hạn')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Tiêu hủy hàng thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDisposeModal(lot) {
    setSelectedLot(lot)
    setDisposeQty('')
    setDisposeReason('Hết hạn')
    setShowDisposeModal(true)
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
        {/* TABLE */}
        <div className="inventory-card">
          <div className="table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Mã Lô</th>
                  <th>Tên Sản Phẩm</th>
                  <th>Tổng Nhập</th>
                  <th>Tồn Hiện Tại</th>
                  <th>Đã Giữ</th>
                  <th>Đã Hủy</th>
                  <th>Còn Lại</th>
                  <th>Ngày SX</th>
                  <th>Ngày HH</th>
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
                      <td style={{ fontWeight: 600, color: '#2c3e50' }}>{lot.imported}</td>
                      <td>{lot.quantity}</td>
                      <td style={{ color: (lot.reserved || 0) > 0 ? '#e67e22' : 'inherit', fontWeight: (lot.reserved || 0) > 0 ? 600 : 400 }}>
                        {lot.reserved || 0}
                      </td>
                      <td style={{ color: (lot.disposed || 0) > 0 ? '#7f8c8d' : 'inherit' }}>
                        {lot.disposed || 0}
                      </td>
                      <td style={{ color: (lot.available ?? lot.quantity) === 0 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
                        {lot.available ?? lot.quantity}
                      </td>
                      <td>
                        {lot.manufacturingDate
                          ? new Date(lot.manufacturingDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
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
                            className="inventory-btn-dispose"
                            onClick={() => openDisposeModal(lot)}
                            disabled={lot.status === 'disposed' || (lot.available ?? lot.quantity) === 0}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                              <path d="M16,9V19H8V9H16M14.5,3H9.5L8.5,4H5V6H19V4H15.5L14.5,3M18,7H6V19C6,20.1 6.9,21 8,21H16C17.1,21 18,20.1 18,19V7Z" />
                            </svg>
                            Hủy
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
                    <td colSpan="9" className="empty-cell">
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
              <div className="inventory-modal-header">
                <h3>Chỉnh Sửa Lô Hàng</h3>
                <button className="inventory-modal-close" onClick={closeEditModal}>×</button>
              </div>
              <form onSubmit={submitEditLot}>
                <div className="inventory-modal-body">
                  <label className="inventory-field">
                    <span>Mã Lô <em>*</em></span>
                    <input
                      type="text"
                      name="lotCode"
                      value={editForm.lotCode}
                      onChange={handleEditFormChange}
                      placeholder="VD: LOT-001"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Tên Sản Phẩm <em>*</em></span>
                    <input
                      type="text"
                      name="productName"
                      value={editForm.productName}
                      onChange={handleEditFormChange}
                      placeholder="Nhập tên sản phẩm"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Số Lượng <em>*</em></span>
                    <input
                      type="number"
                      name="quantity"
                      value={editForm.quantity}
                      onChange={handleEditFormChange}
                      placeholder="Nhập số lượng"
                      min="0"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Ngày Sản Xuất</span>
                    <input
                      type="date"
                      name="manufacturingDate"
                      value={editForm.manufacturingDate}
                      onChange={handleEditFormChange}
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Ngày Hết Hạn <em>*</em></span>
                    <input
                      type="date"
                      name="expiryDate"
                      value={editForm.expiryDate}
                      onChange={handleEditFormChange}
                      required
                    />
                  </label>
                </div>
                <div className="inventory-modal-footer">
                  <button type="button" className="inventory-btn-cancel" onClick={closeEditModal}>
                    Hủy
                  </button>
                  <button type="submit" className="inventory-btn-save" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : 'Cập Nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE MODAL */}
        {showCreateModal && (
          <div className="inventory-modal-overlay" onClick={closeCreateModal}>
            <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
              <div className="inventory-modal-header">
                <h3>Tạo Lô Hàng Mới</h3>
                <button className="inventory-modal-close" onClick={closeCreateModal}>×</button>
              </div>
              <form onSubmit={submitCreateLot}>
                <div className="inventory-modal-body">
                  <label className="inventory-field">
                    <span>Mã Lô <em>*</em></span>
                    <input
                      type="text"
                      name="lotCode"
                      value={createForm.lotCode}
                      onChange={handleCreateFormChange}
                      placeholder="VD: LOT-001"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Tên Sản Phẩm <em>*</em></span>
                    <input
                      type="text"
                      name="productName"
                      value={createForm.productName}
                      onChange={handleCreateFormChange}
                      placeholder="Nhập tên sản phẩm"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Số Lượng <em>*</em></span>
                    <input
                      type="number"
                      name="quantity"
                      value={createForm.quantity}
                      onChange={handleCreateFormChange}
                      placeholder="Nhập số lượng"
                      min="0"
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Ngày Sản Xuất</span>
                    <input
                      type="date"
                      name="manufacturingDate"
                      value={createForm.manufacturingDate}
                      onChange={handleCreateFormChange}
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Ngày Hết Hạn <em>*</em></span>
                    <input
                      type="date"
                      name="expiryDate"
                      value={createForm.expiryDate}
                      onChange={handleCreateFormChange}
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Trạng Thái</span>
                    <select
                      name="status"
                      value={createForm.status}
                      onChange={handleCreateFormChange}
                    >
                      {lotStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="inventory-modal-footer">
                  <button type="button" className="inventory-btn-cancel" onClick={closeCreateModal}>
                    Hủy
                  </button>
                  <button type="submit" className="inventory-btn-save" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DISPOSE MODAL */}
        {showDisposeModal && selectedLot && (
          <div className="inventory-modal-overlay" onClick={() => setShowDisposeModal(false)}>
            <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
              <div className="inventory-modal-header">
                <h3>Tiêu Hủy Hàng Hóa</h3>
                <button className="inventory-modal-close" onClick={() => setShowDisposeModal(false)}>×</button>
              </div>
              <form onSubmit={handleDisposeLot}>
                <div className="inventory-modal-body">
                  <div className="dispose-info">
                    <p>Sản phẩm: <strong>{selectedLot.productName}</strong></p>
                    <p>Mã lô: <strong>{selectedLot.lotCode}</strong></p>
                    <p>Khả dụng để hủy: <strong>{selectedLot.available ?? selectedLot.quantity}</strong></p>
                  </div>
                  <label className="inventory-field">
                    <span>Số lượng hủy <em>*</em></span>
                    <input
                      type="number"
                      value={disposeQty}
                      onChange={(e) => setDisposeQty(e.target.value)}
                      placeholder="Nhập số lượng cần tiêu hủy"
                      min="1"
                      max={selectedLot.available ?? selectedLot.quantity}
                      required
                    />
                  </label>
                  <label className="inventory-field">
                    <span>Lý do hủy</span>
                    <select
                      value={disposeReason}
                      onChange={(e) => setDisposeReason(e.target.value)}
                    >
                      <option value="Hết hạn">Hết hạn</option>
                      <option value="Hư hỏng">Hư hỏng / Ôi thiu</option>
                      <option value="Lỗi bao bì">Lỗi bao bì</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </label>
                </div>
                <div className="inventory-modal-footer">
                  <button type="button" className="inventory-btn-cancel" onClick={() => setShowDisposeModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="inventory-btn-danger" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Hủy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {(success || error) && (
          <div className={`product-toast ${success ? 'success' : 'error'}`}>
            <div className="toast-content">
              <span className="toast-icon">
                {success ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
              </span>
              <p className="toast-message">{success || error}</p>
            </div>
            <button className="toast-close" onClick={() => { setSuccess(''); setError(''); }}>×</button>
          </div>
        )}
      </div>
    </StaffLayout>
  )
}
