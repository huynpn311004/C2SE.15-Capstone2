import { useEffect, useState, useMemo } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchProducts,
  fetchProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  importProducts,
  uploadProductImage,
} from '../../services/staffApi'
import { getProductImageUrl } from '../../services/staffApi'
import './ProductManagement.css'

export default function ProductManagement() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [adjustStockTarget, setAdjustStockTarget] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isAdjustingStock, setIsAdjustingStock] = useState(false)
  const [previewPlan, setPreviewPlan] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilterProductId, setAuditFilterProductId] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    basePrice: '',
    categoryId: '',
    imageUrl: '',
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [stockForm, setStockForm] = useState({
    targetQuantity: '',
    reason: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [prodData, catData] = await Promise.all([
        fetchProducts(),
        fetchProductCategories(),
      ])
      setProducts(prodData)
      setCategories(catData)
    } catch (err) {
      setError('Không thể tải dữ liệu sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = !categoryFilter || p.categoryId === parseInt(categoryFilter)
      return matchSearch && matchCat
    })
  }, [products, searchTerm, categoryFilter])

  function openAddModal() {
    setEditingProduct(null)
    setFormData({ name: '', sku: '', basePrice: '', categoryId: '', imageUrl: '' })
    setSelectedImage(null)
    setImagePreview('')
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function openEditModal(product) {
    const fullImageUrl = getProductImageUrl(product.imageUrl)
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      basePrice: product.basePrice.toString(),
      categoryId: product.categoryId ? product.categoryId.toString() : '',
      imageUrl: fullImageUrl || '',
    })
    setSelectedImage(null)
    setImagePreview('')
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingProduct(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview('')
    setSelectedImage(null)
    setError('')
  }

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  function handleImageFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh')
      return
    }
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
    setFormData(prev => ({ ...prev, imageUrl: '' }))
    setError('')
  }

  function clearSelectedImage(keepFormUrl = false) {
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview('')
    if (!keepFormUrl) {
      setFormData(prev => ({ ...prev, imageUrl: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Tên sản phẩm không được để trống')
      return
    }
    if (!editingProduct && !formData.sku.trim()) {
      setError('SKU không được để trống')
      return
    }
    if (!formData.basePrice || isNaN(Number(formData.basePrice)) || Number(formData.basePrice) < 0) {
      setError('Giá không hợp lệ')
      return
    }

    try {
      setSaving(true)
      let imageUrl = formData.imageUrl.trim()

      // Nếu có chọn ảnh từ máy, upload ảnh lên server trước
      if (selectedImage) {
        try {
          imageUrl = await uploadProductImage(selectedImage)
        } catch (uploadErr) {
          setError('Không thể upload hình ảnh. Vui lòng thử lại.')
          setSaving(false)
          return
        }
      }

      const payload = {
        name: formData.name.trim(),
        basePrice: Number(formData.basePrice),
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        imageUrl: imageUrl,
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        setSuccess('Cập nhật sản phẩm thành công')
      } else {
        await createProduct({ ...payload, sku: formData.sku.trim() })
        setSuccess('Tạo sản phẩm thành công')
      }
      await loadData()
      setTimeout(() => closeModal(), 800)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete(product) {
    try {
      await deleteProduct(product.id)
      setSuccess('Xóa sản phẩm thành công')
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Xóa thất bại')
    }
    setDeleteConfirm(null)
  }

  function openAdjustStockModal(product) {
    setAdjustStockTarget(product)
    setStockForm({
      targetQuantity: String(product.totalStock || 0),
      reason: '',
    })
    setError('')
    setSuccess('')
  }

  function openAuditModal(productId = null) {
    setAuditFilterProductId(productId)
    setAuditModalOpen(true)
    loadAuditLogs(productId)
  }

  function closeAuditModal() {
    setAuditModalOpen(false)
    setAuditLogs([])
    setAuditFilterProductId(null)
  }

  async function loadAuditLogs(productId = null) {
    try {
      setAuditLoading(true)
      setError('')
      const params = { action: 'UPDATE_STOCK', entity_type: 'product' }
      if (productId) params.entity_id = productId
      const items = await import('../../services/staffApi').then(m => m.fetchAuditLogs(params))
      setAuditLogs(items)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Không tải được lịch sử')
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }

  function closeAdjustStockModal() {
    setAdjustStockTarget(null)
    setStockForm({ targetQuantity: '', reason: '' })
    setPreviewPlan(null)
    setPreviewLoading(false)
  }

  async function handleAdjustStockSubmit(e) {
    e.preventDefault()
    if (!adjustStockTarget) return

    const nextQuantity = Number(stockForm.targetQuantity)
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      setError('Số lượng mục tiêu phải là số >= 0')
      return
    }

    try {
      setIsAdjustingStock(true)
      setError('')
      const result = await adjustProductStock(adjustStockTarget.id, {
        targetQuantity: nextQuantity,
        reason: stockForm.reason,
      })
      await loadData()
      setSuccess(result?.message || 'Điều chỉnh tồn kho thành công')
      closeAdjustStockModal()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Điều chỉnh tồn kho thất bại')
    } finally {
      setIsAdjustingStock(false)
    }
  }

  async function handlePreviewAllocation() {
    if (!adjustStockTarget) return
    const nextQuantity = Number(stockForm.targetQuantity)
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      setError('Số lượng mục tiêu phải là số >= 0')
      return
    }
    try {
      setPreviewLoading(true)
      setError('')
      const { items, oldTotal, newTotal } = await import('../../services/staffApi').then(m => m.previewAdjustProductStock(adjustStockTarget.id, { targetQuantity: nextQuantity, reason: stockForm.reason }))
      setPreviewPlan({ items, oldTotal, newTotal })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Xem trước phân bổ thất bại')
      setPreviewPlan(null)
    } finally {
      setPreviewLoading(false)
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

      const result = await importProducts(selectedFile)
      await loadData()

      let message = `Import thành công: sản phẩm tạo mới ${result.productsCreated || 0}, cập nhật ${result.productsUpdated || 0}`
      message += ` | lô hàng tạo mới ${result.lotsCreated || 0}, cập nhật ${result.lotsUpdated || 0}`
      if (result.failed) {
        const firstError = result.errors?.[0]
        const detail = firstError
          ? ` Dòng lỗi đầu tiên: ${firstError.row} - ${firstError.message}`
          : ''
        message += `. Lỗi ${result.failed}.${detail}`
      }
      setSuccess(message)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Import file thất bại')
    } finally {
      setIsImporting(false)
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  return (
    <StaffLayout>
      <div className="product-page">
        {/* TOOLBAR */}
        <div className="product-toolbar">
          <div className="product-toolbar-filters">
            <div className="product-search-box">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="product-filter-group">
              <label>Lọc theo danh mục:</label>
              <select
                className="product-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="product-toolbar-actions">
            <label className={`product-upload-btn ${isImporting ? 'is-disabled' : ''}`}>
              {isImporting ? 'Đang import...' : 'Upload Excel/CSV'}
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleImportFile}
                disabled={isImporting}
                hidden
              />
            </label>
            <button className="product-btn-create product-toolbar-btn" onClick={openAddModal}>
              Thêm Sản Phẩm
            </button>
            <button className="product-btn" onClick={() => openAuditModal(null)} style={{ marginLeft: '8px' }}>
              Xem Lịch Sử Chỉnh Sửa
            </button>
          </div>
          <div className="product-toolbar-info">
            Hiển thị {filteredProducts.length} sản phẩm
          </div>
        </div>

        <div className="product-import-hint">
          <strong>Mẫu cột import:</strong> <code>ten_san_pham</code>, <code>sku</code>, <code>base_price</code>, <code>danh_muc</code>, <code>image_url</code>.
          Có thể dùng thêm các tên thay thế như <code>product_name</code>, <code>ma_sku</code>, <code>gia_ban</code>, <code>ten_danh_muc</code>, <code>hinh</code>, <code>anh</code>.
          Nếu muốn hiện hình ngay sau import, cột <code>image_url</code> nên là link ảnh trực tiếp hoặc đường dẫn nội bộ dạng <code>/uploads/products/ten_file.jpg</code>.
        </div>

        {error && <div className="product-alert product-alert-error">{error}</div>}
        {success && <div className="product-alert product-alert-success">{success}</div>}

        {/* CARD + TABLE */}
        <div className="product-card">
          <div className="product-table-wrapper">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Hình</th>
                  <th>SKU</th>
                  <th>Tên Sản Phẩm</th>
                  <th>Danh Mục</th>
                  <th>Giá</th>
                  <th>Tồn Kho</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="product-empty-cell">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="product-empty-cell">
                      Không có sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.imageUrl ? (
                          <img
                            src={getProductImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="product-image-thumb"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div className={`product-image-placeholder ${product.imageUrl ? 'hidden' : ''}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                        </div>
                      </td>
                      <td>
                        <span className="product-sku">{product.sku}</span>
                      </td>
                      <td>{product.name}</td>
                      <td>
                        <span className="product-category-badge">
                          {product.categoryName}
                        </span>
                      </td>
                      <td className="product-price">
                        {formatCurrency(product.basePrice)}
                      </td>
                      <td>
                        <span className={`product-stock ${product.totalStock > 0 ? 'in-stock' : 'out-stock'}`}>
                          {product.totalStock}
                        </span>
                      </td>
                      <td className="product-actions-cell">
                        <div className="product-actions">
                          <button
                            className="product-btn-edit"
                            onClick={() => openEditModal(product)}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                            Sửa
                          </button>
                          <button
                            className="product-btn-adjust"
                            onClick={() => openAdjustStockModal(product)}
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                              <path d="M13 3h-2v8H3v2h8v8h2v-8h8v-2h-8z" />
                            </svg>
                            Chỉnh Tồn
                          </button>
                          <button
                            className="product-btn-delete"
                            onClick={() => setDeleteConfirm(product)}
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
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="product-modal-overlay" onClick={closeModal}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>{editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
              <button className="product-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="product-modal-body">
                <div className="product-form-row">
                  <label className="product-field">
                    <span>Tên Sản Phẩm <em>*</em></span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nhập tên sản phẩm"
                      autoFocus
                    />
                  </label>
                  <label className="product-field">
                    <span>SKU <em>*</em></span>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="Mã SKU"
                      disabled={!!editingProduct}
                    />
                  </label>
                </div>
                <div className="product-form-row">
                  <label className="product-field">
                    <span>Giá (VNĐ) <em>*</em></span>
                    <input
                      type="number"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                    />
                  </label>
                  <label className="product-field">
                    <span>Danh Mục</span>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="product-field product-field-full">
                  <span>Hình Ảnh Sản Phẩm</span>
                  <div className="product-image-upload-wrapper">
                    <label className="product-btn-select-image">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                      Chọn Ảnh từ Máy
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        hidden
                      />
                    </label>
                    <span className="product-image-or">hoặc</span>
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleInputChange}
                      placeholder="Nhập URL hình ảnh"
                      className="product-image-url-input"
                    />
                  </div>
                  {(imagePreview || formData.imageUrl) && (
                    <div className="product-image-preview-wrapper">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="product-image-preview" />
                      ) : formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="Preview" className="product-image-preview"
                          onError={(e) => { e.target.style.display = 'none' }} />
                      ) : null}
                      <button
                        type="button"
                        className="product-btn-remove-image"
                        onClick={() => clearSelectedImage(false)}
                        title="Xóa ảnh"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </label>
                {error && <p className="product-error">{error}</p>}
              </div>
              <div className="product-modal-footer">
                <button type="button" className="product-btn-cancel" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="product-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingProduct ? 'Cập Nhật' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {deleteConfirm && (
        <div className="product-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="product-modal product-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>Xác Nhận Xóa</h3>
              <button className="product-modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="product-modal-body">
              <p className="product-delete-text">
                Bạn có chắc muốn xóa sản phẩm "<strong>{deleteConfirm.name}</strong>"?
              </p>
              {deleteConfirm.totalStock > 0 && (
                <p className="product-warning">
                  Cảnh báo: Sản phẩm này đang có {deleteConfirm.totalStock} sản phẩm trong kho.
                </p>
              )}
            </div>
            <div className="product-modal-footer">
              <button
                type="button"
                className="product-btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="product-btn-confirm-delete"
                onClick={() => confirmDelete(deleteConfirm)}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Điều Chỉnh Tồn Kho */}
      {adjustStockTarget && (
        <div className="product-modal-overlay" onClick={closeAdjustStockModal}>
          <div className="product-modal product-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>Điều Chỉnh Tồn Kho</h3>
              <button className="product-modal-close" onClick={closeAdjustStockModal}>×</button>
            </div>
            <form onSubmit={handleAdjustStockSubmit}>
              <div className="product-modal-body">
                <p className="product-delete-text">
                  Sản phẩm: <strong>{adjustStockTarget.name}</strong>
                </p>
                <p className="product-warning">
                  Tồn kho hiện tại: {adjustStockTarget.totalStock}
                </p>
                <label className="product-field">
                  <span>Số lượng mục tiêu <em>*</em></span>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.targetQuantity}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, targetQuantity: e.target.value }))}
                    placeholder="Nhập tổng tồn kho mới"
                  />
                </label>
                <label className="product-field">
                  <span>Lý do điều chỉnh</span>
                  <input
                    type="text"
                    value={stockForm.reason}
                    onChange={(e) => setStockForm((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Ví dụ: kiểm kê cuối ngày"
                  />
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="product-btn" onClick={handlePreviewAllocation} disabled={previewLoading}>
                    {previewLoading ? 'Đang xem trước...' : 'Xem trước phân bổ'}
                  </button>
                  <span style={{ alignSelf: 'center', color: '#666' }}>(Xem phân bổ per-lô trước khi xác nhận)</span>
                </div>

                {previewPlan && (
                  <div className="product-preview-box">
                    <h4>Preview phân bổ</h4>
                    <p>Old total: {previewPlan.oldTotal} → New total: {previewPlan.newTotal}</p>
                    <table className="product-preview-table">
                      <thead>
                        <tr><th>Mã Lô</th><th>Old</th><th>New</th><th>Ghi chú</th></tr>
                      </thead>
                      <tbody>
                        {previewPlan.items.map((it, idx) => (
                          <tr key={idx}>
                            <td>{it.lotCode || '(new)'}</td>
                            <td>{it.oldQty}</td>
                            <td>{it.newQty}</td>
                            <td>{it.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="product-modal-footer">
                <button
                  type="button"
                  className="product-btn-cancel"
                  onClick={closeAdjustStockModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="product-btn-save"
                  disabled={isAdjustingStock}
                >
                  {isAdjustingStock ? 'Đang cập nhật...' : 'Cập nhật tồn kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Lịch Sử Audit */}
      {auditModalOpen && (
        <div className="product-modal-overlay" onClick={closeAuditModal}>
          <div className="product-modal audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>Lịch Sử Chỉnh Sửa Tồn Kho</h3>
              <button className="product-modal-close" onClick={closeAuditModal}>×</button>
            </div>
            <div className="product-modal-body">
              {auditLoading ? (
                <p>Đang tải...</p>
              ) : auditLogs.length === 0 ? (
                <p>Không có bản ghi nào</p>
              ) : (
                <div className="audit-list">
                  {auditLogs.map((log) => {
                    const oldv = log.old_value || {}
                    const newv = log.new_value || {}
                    const nv = { ...oldv, ...newv }
                    const perLot = newv.per_lot || newv.perLot || oldv.per_lot || oldv.perLot || []
                    return (
                      <div className="audit-card" key={log.id}>
                        <div className="audit-card-header">
                          <div className="audit-time">{new Date(log.created_at).toLocaleString()}</div>
                          <div className="audit-meta">
                            <span className="badge">Nhân viên: {log.user_name || 'Không rõ'}</span>
                            <span className="badge">Sản phẩm: {log.product_name || 'Không rõ'}</span>
                            <span className="badge">{log.action}</span>
                          </div>
                        </div>
                        <div className="audit-card-body">
                          {nv.reason && <div className="audit-reason">Lý do: {nv.reason}</div>}
                          {Array.isArray(perLot) && perLot.length > 0 ? (
                            <table className="audit-lot-table">
                              <thead>
                                <tr><th>Lô</th><th>Old</th><th>New</th><th>Ghi chú</th></tr>
                              </thead>
                              <tbody>
                                {perLot.map((p, i) => (
                                  <tr key={i}>
                                    <td>{p.lotCode || p.lot_code || '(new)'}</td>
                                    <td>{p.oldQty ?? p.old ?? p.old_qty ?? ''}</td>
                                    <td>{p.newQty ?? p.new ?? p.new_qty ?? ''}</td>
                                    <td>{p.note || ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (newv.total_stock !== undefined || oldv.total_stock !== undefined) ? (
                            <div className="audit-summary">Tổng: {oldv.total_stock ?? '-'} → {newv.total_stock ?? '-'}</div>
                          ) : (
                            nv.reason ? null : <div className="audit-json">{JSON.stringify(nv, null, 2)}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="product-modal-footer">
              <button className="product-btn-cancel" onClick={closeAuditModal}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  )
}
