import { useEffect, useState, useMemo } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchProducts,
  fetchProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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
          </div>
          <div className="product-toolbar-info">
            Hiển thị {filteredProducts.length} sản phẩm
          </div>
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
    </StaffLayout>
  )
}
