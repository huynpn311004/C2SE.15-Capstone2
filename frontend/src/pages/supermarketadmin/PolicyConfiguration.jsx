import { useEffect, useState } from 'react'
import {
  fetchDiscountPolicies,
  createDiscountPolicy,
  updateDiscountPolicy,
  deleteDiscountPolicy,
  toggleDiscountPolicy,
} from '../../services/discountPolicyApi'
import { fetchSupermarketProducts, fetchSupermarketCategories } from '../../services/supermarketAdminApi'
import './PolicyConfiguration.css'

function getUserId() {
  try {
    const raw = localStorage.getItem('seims_auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id || null
  } catch {
    return null
  }
}

export default function PolicyConfiguration() {
  const [policies, setPolicies] = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [form, setForm] = useState({
    name: '',
    minDaysLeft: '',
    maxDaysLeft: '',
    discountPercent: '',
    categoryId: '',
    productId: '',
    applyType: 'all',
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      setLoading(true)
      setError('')
      await Promise.all([
        loadPolicies(),
        loadCategories(),
        loadProducts(),
      ])
    } catch (err) {
      setError('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  async function loadPolicies() {
    try {
      const data = await fetchDiscountPolicies()
      setPolicies(data)
    } catch (err) {
      console.error('Error loading policies:', err)
    }
  }

  async function loadCategories() {
    try {
      const data = await fetchSupermarketCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading categories:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Không thể tải danh mục'
      setError(errorMsg)
    }
  }

  async function loadProducts() {
    try {
      const data = await fetchSupermarketProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading products:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Không thể tải sản phẩm'
      setError(errorMsg)
    }
  }

  function openCreateModal() {
    setEditMode(false)
    setSelectedPolicy(null)
    setForm({
      name: '',
      minDaysLeft: '',
      maxDaysLeft: '',
      discountPercent: '',
      categoryId: '',
      productId: '',
      applyType: 'all',
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function openEditModal(policy) {
    setEditMode(true)
    setSelectedPolicy(policy)
    let applyType = 'all'
    if (policy.productId) applyType = 'product'
    else if (policy.categoryId) applyType = 'category'

    setForm({
      name: policy.name,
      minDaysLeft: String(policy.minDaysLeft),
      maxDaysLeft: String(policy.maxDaysLeft),
      discountPercent: String(policy.discountPercent),
      categoryId: String(policy.categoryId || ''),
      productId: String(policy.productId || ''),
      applyType: applyType,
    })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedPolicy(null)
    setError('')
    setSuccess('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const minDays = parseInt(form.minDaysLeft)
    const maxDays = parseInt(form.maxDaysLeft)
    const discount = parseFloat(form.discountPercent)

    if (!form.name.trim()) {
      setError('Tên chính sách không được trống')
      return
    }
    if (isNaN(minDays) || minDays < 0) {
      setError('Số ngày tối thiểu không hợp lệ')
      return
    }
    if (isNaN(maxDays) || maxDays < minDays) {
      setError('Số ngày tối đa phải lớn hơn hoặc bằng số ngày tối thiểu')
      return
    }
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError('Phần trăm giảm giá phải từ 0 đến 100')
      return
    }

    if (form.applyType === 'category' && !form.categoryId) {
      setError('Hãy chọn danh mục')
      return
    }
    if (form.applyType === 'product' && !form.productId) {
      setError('Hãy chọn sản phẩm')
      return
    }

    try {
      const payload = {
        name: form.name.trim(),
        minDaysLeft: minDays,
        maxDaysLeft: maxDays,
        discountPercent: discount,
        categoryId: form.applyType === 'category' ? parseInt(form.categoryId) : null,
        productId: form.applyType === 'product' ? parseInt(form.productId) : null,
      }

      if (editMode && selectedPolicy) {
        await updateDiscountPolicy(selectedPolicy.id, payload)
        setSuccess('Cập nhật chính sách thành công!')
      } else {
        await createDiscountPolicy(payload)
        setSuccess('Tạo chính sách mới thành công!')
      }
      await loadPolicies()
      setTimeout(closeModal, 1200)
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi')
    }
  }

  async function handleToggle(policy) {
    try {
      await toggleDiscountPolicy(policy.id)
      setSuccess(`Đã ${policy.isActive ? 'tắt' : 'bật'} chính sách "${policy.name}"`)
      await loadPolicies()
    } catch (err) {
      setError(err.message || 'Không thể thay đổi trạng thái')
    }
  }

  async function handleDelete(policy) {
    if (!window.confirm(`Bạn có chắc muốn xóa chính sách "${policy.name}"?`)) return
    try {
      await deleteDiscountPolicy(policy.id)
      setSuccess('Xóa chính sách thành công!')
      await loadPolicies()
    } catch (err) {
      setError(err.message || 'Không thể xóa chính sách')
    }
  }

  function getStatusBadge(isActive) {
    return isActive ? 'badge-success' : 'badge-danger'
  }

  function getStatusLabel(isActive) {
    return isActive ? 'Đang bật' : 'Đã tắt'
  }

  return (
    <div className="sapolicy-page">
      {/* TOOLBAR */}
      <div className="sapolicy-toolbar">
        <div className="sapolicy-toolbar-info">
          {loading ? 'Đang tải...' : `Hiển thị ${policies.length} chính sách`}
        </div>
        <button className="sapolicy-btn-create" onClick={openCreateModal}>
          Thêm Chính Sách
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="sapolicy-alert sapolicy-alert-error">
          {error}
          <button onClick={() => setError('')} className="sapolicy-alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="sapolicy-alert sapolicy-alert-success">
          {success}
          <button onClick={() => setSuccess('')} className="sapolicy-alert-close">✕</button>
        </div>
      )}

      {/* CARD + TABLE */}
      <div className="sapolicy-card">
        {loading ? (
          <div className="sapolicy-loading">
            <div className="sapolicy-spinner"></div>
            <p>Đang tải danh sách chính sách...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sapolicy-table">
              <thead>
                <tr>
                  <th>TÊN CHÍNH SÁCH</th>
                  <th>ÁP DỤNG CHO</th>
                  <th>SỐ NGÀY ÁP DỤNG</th>
                  <th>GIẢM GIÁ</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                      Chưa có chính sách nào
                    </td>
                  </tr>
                ) : (
                  policies.map(policy => (
                    <tr key={policy.id} className={!policy.isActive ? 'row-inactive' : ''}>
                      <td>
                        <span className="sapolicy-name">{policy.name}</span>
                      </td>
                      <td>
                        <span className="sapolicy-applies-to">
                          {policy.appliesTo || 'Tất cả sản phẩm'}
                        </span>
                      </td>
                      <td>
                        <span className="sapolicy-days">
                          {policy.minDaysLeft} - {policy.maxDaysLeft} ngày
                        </span>
                      </td>
                      <td>
                        <span className="sapolicy-discount">-{policy.discountPercent}%</span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(policy.isActive)}`}>
                          {getStatusLabel(policy.isActive)}
                        </span>
                      </td>
                      <td>
                        <div className="sapolicy-actions">
                          <button
                            className="sapolicy-btn-toggle"
                            onClick={() => handleToggle(policy)}
                            title={policy.isActive ? 'Tắt chính sách' : 'Bật chính sách'}
                          >
                            {policy.isActive ? '⏸' : '▶'}
                          </button>
                          <button
                            className="sapolicy-btn-edit"
                            onClick={() => openEditModal(policy)}
                          >
                            <svg className="sapolicy-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Sửa
                          </button>
                          <button
                            className="sapolicy-btn-delete"
                            onClick={() => handleDelete(policy)}
                          >
                            <svg className="sapolicy-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
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
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="sapolicy-modal-overlay" onClick={closeModal}>
          <div className="sapolicy-modal" onClick={e => e.stopPropagation()}>
            <div className="sapolicy-modal-header">
              <h3>{editMode ? 'Chỉnh Sửa Chính Sách' : 'Tạo Chính Sách Mới'}</h3>
              <button className="sapolicy-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sapolicy-modal-body">
                <div className="sapolicy-form-grid">
                  <div className="sapolicy-form-field full-width">
                    <label>Tên Chính Sách *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="VD: Giảm giá rau xanh sắp hết hạn"
                      className="sapolicy-input"
                      required
                    />
                  </div>

                  <div className="sapolicy-form-field full-width">
                    <label>Áp Dụng Cho *</label>
                    <div className="sapolicy-radio-group">
                      <label className="sapolicy-radio-label">
                        <input
                          type="radio"
                          name="applyType"
                          value="all"
                          checked={form.applyType === 'all'}
                          onChange={handleChange}
                        />
                        <span>Tất cả sản phẩm</span>
                      </label>
                      <label className="sapolicy-radio-label">
                        <input
                          type="radio"
                          name="applyType"
                          value="category"
                          checked={form.applyType === 'category'}
                          onChange={handleChange}
                        />
                        <span>Danh mục</span>
                      </label>
                      <label className="sapolicy-radio-label">
                        <input
                          type="radio"
                          name="applyType"
                          value="product"
                          checked={form.applyType === 'product'}
                          onChange={handleChange}
                        />
                        <span>Sản phẩm cụ thể</span>
                      </label>
                    </div>
                  </div>

                  {form.applyType === 'category' && (
                    <div className="sapolicy-form-field full-width">
                      <label>Chọn Danh Mục *</label>
                      <select
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        className="sapolicy-input"
                        required={form.applyType === 'category'}
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.applyType === 'product' && (
                    <div className="sapolicy-form-field full-width">
                      <label>Chọn Sản Phẩm *</label>
                      <select
                        name="productId"
                        value={form.productId}
                        onChange={handleChange}
                        className="sapolicy-input"
                        required={form.applyType === 'product'}
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sapolicy-form-field">
                    <label>Phần trăm giảm giá (%) *</label>
                    <input
                      type="number"
                      name="discountPercent"
                      value={form.discountPercent}
                      onChange={handleChange}
                      placeholder="VD: 30"
                      className="sapolicy-input"
                      min="0"
                      max="100"
                      required
                    />
                  </div>

                  <div className="sapolicy-form-field">
                    <label>Số ngày tối thiểu *</label>
                    <input
                      type="number"
                      name="minDaysLeft"
                      value={form.minDaysLeft}
                      onChange={handleChange}
                      placeholder="VD: 1"
                      className="sapolicy-input"
                      min="0"
                      required
                    />
                  </div>

                  <div className="sapolicy-form-field">
                    <label>Số ngày tối đa *</label>
                    <input
                      type="number"
                      name="maxDaysLeft"
                      value={form.maxDaysLeft}
                      onChange={handleChange}
                      placeholder="VD: 7"
                      className="sapolicy-input"
                      min="0"
                      required
                    />
                  </div>

                </div>
                {error && <p className="sapolicy-error">{error}</p>}
                {success && <p className="sapolicy-success">{success}</p>}
              </div>
              <div className="sapolicy-modal-footer">
                <button type="submit" className="sapolicy-btn-save">{editMode ? 'Lưu Thay Đổi' : 'Tạo Mới'}</button>
                <button type="button" className="sapolicy-btn-cancel" onClick={closeModal}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
