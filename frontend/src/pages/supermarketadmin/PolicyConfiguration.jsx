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

function Toast({ message, visible, onClose }) {
  if (!visible) return null;
  
  const isError = message.includes('Lỗi') || message.includes('thất bại') || message.includes('Không thể') || message.includes('không hợp lệ') || message.includes('phải lớn hơn') || message.includes('không được trống') || message.includes('Hãy chọn');

  return (
    <div className={`sapolicy-toast ${isError ? 'error' : 'success'}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {!isError ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </span>
        <p className="toast-message">{message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

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
  const [toast, setToast] = useState({ visible: false, message: '' })
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

  const showToast = (msg) => {
    setToast({ visible: true, message: msg })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500)
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      setLoading(true)
      await Promise.all([
        loadPolicies(),
        loadCategories(),
        loadProducts(),
      ])
    } catch (err) {
      showToast('Không thể tải dữ liệu')
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
      showToast(errorMsg)
    }
  }

  async function loadProducts() {
    try {
      const data = await fetchSupermarketProducts()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading products:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Không thể tải sản phẩm'
      showToast(errorMsg)
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
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedPolicy(null)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // 1. Prepare and Validate Data
    let isTemplate = form.applyType === 'all' && form.useTemplate731;
    let finalPayloads = []; // For template mode (3 policies)
    let singlePayload = null; // For standard mode (1 policy)

    try {
      if (isTemplate) {
        // Collect template data
        const levels = [
          { d: parseInt(form.d7 || '7'), p: parseFloat(form.p7 || '20') },
          { d: parseInt(form.d3 || '3'), p: parseFloat(form.p3 || '50') },
          { d: parseInt(form.d1 || '1'), p: parseFloat(form.p1 || '80') }
        ].sort((a, b) => b.d - a.d); // Ensure order: 10 > 5 > 2

        // Validation for template
        if (levels.some(l => isNaN(l.d) || isNaN(l.p) || l.d < 0 || l.p < 0)) {
          showToast('Vui lòng nhập đầy đủ thông số hợp lệ cho mẫu');
          return;
        }
        if (levels[0].d <= levels[1].d || levels[1].d <= levels[2].d) {
          showToast('Mốc ngày phải giảm dần (Mốc 1 > Mốc 2 > Mốc 3)');
          return;
        }

        // Prepare 3 payloads
        finalPayloads = [
          { name: `Giảm giá (${levels[1].d + 1}-${levels[0].d} ngày)`, minDaysLeft: levels[1].d + 1, maxDaysLeft: levels[0].d, discountPercent: levels[0].p, categoryId: null, productId: null },
          { name: `Giảm giá (${levels[2].d + 1}-${levels[1].d} ngày)`, minDaysLeft: levels[2].d + 1, maxDaysLeft: levels[1].d, discountPercent: levels[1].p, categoryId: null, productId: null },
          { name: `Giảm giá (0-${levels[2].d} ngày)`, minDaysLeft: 0, maxDaysLeft: levels[2].d, discountPercent: levels[2].p, categoryId: null, productId: null }
        ];
      } else {
        // Validation for standard
        const minDays = parseInt(form.minDaysLeft)
        const maxDays = parseInt(form.maxDaysLeft)
        const discount = parseFloat(form.discountPercent)

        if (!form.name.trim()) return showToast('Tên chính sách không được trống');
        if (isNaN(minDays) || isNaN(maxDays) || isNaN(discount)) return showToast('Vui lòng nhập số hợp lệ');
        if (maxDays < minDays) return showToast('Ngày tối đa phải >= ngày tối thiểu');
        
        if (form.applyType === 'category' && !form.categoryId) return showToast('Hãy chọn danh mục');
        if (form.applyType === 'product' && !form.productId) return showToast('Hãy chọn sản phẩm');

        singlePayload = {
          name: form.name.trim(),
          minDaysLeft: minDays,
          maxDaysLeft: maxDays,
          discountPercent: discount,
          categoryId: form.applyType === 'category' ? parseInt(form.categoryId) : null,
          productId: form.applyType === 'product' ? parseInt(form.productId) : null,
        };
      }

      // 2. Execute API Calls
      setLoading(true)
      if (isTemplate) {
        // Delete old global policies
        const globalPolicies = policies.filter(p => !p.productId && !p.categoryName)
        for (const p of globalPolicies) {
          await deleteDiscountPolicy(p.id)
        }
        // Create 3 new ones
        for (const payload of finalPayloads) {
          await createDiscountPolicy(payload)
        }
        showToast('Đã thiết lập bộ chiến lược giảm giá thành công!')
      } else {
        if (editMode && selectedPolicy) {
          await updateDiscountPolicy(selectedPolicy.id, singlePayload)
          showToast('Cập nhật chính sách thành công!')
        } else {
          await createDiscountPolicy(singlePayload)
          showToast('Tạo chính sách mới thành công!')
        }
      }

      await loadPolicies()
      setTimeout(closeModal, 1200)
    } catch (err) {
      showToast('Lỗi: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(policy) {
    try {
      await toggleDiscountPolicy(policy.id)
      showToast(`Đã ${policy.isActive ? 'tắt' : 'bật'} chính sách "${policy.name}"`)
      await loadPolicies()
    } catch (err) {
      showToast(err.message || 'Không thể thay đổi trạng thái')
    }
  }

  async function handleDelete(policy) {
    if (!window.confirm(`Bạn có chắc muốn xóa chính sách "${policy.name}"?`)) return
    try {
      await deleteDiscountPolicy(policy.id)
      showToast('Xóa chính sách thành công!')
      await loadPolicies()
    } catch (err) {
      showToast(err.message || 'Không thể xóa chính sách')
    }
  }

  async function handleApplyQuickStrategy() {
    const p7 = parseFloat(document.getElementById('q7')?.value)
    const p3 = parseFloat(document.getElementById('q3')?.value)
    const p1 = parseFloat(document.getElementById('q1')?.value)

    if (isNaN(p7) || isNaN(p3) || isNaN(p1)) {
      showToast('Vui lòng nhập đầy đủ các mức giảm giá')
      return
    }

    if (!window.confirm('Hệ thống sẽ thay thế các chính sách chung hiện tại bằng bộ quy tắc 7-3-1 ngày mới. Bạn có chắc chắn?')) return

    try {
      setLoading(true)
      
      // 1. Delete existing global policies to avoid overlap errors
      const globalPolicies = policies.filter(p => !p.productId && !p.categoryName)
      for (const p of globalPolicies) {
        await deleteDiscountPolicy(p.id)
      }

      // 2. Create new 3 levels
      // Level 1: 4-7 days
      await createDiscountPolicy({
        name: 'Giảm giá tự động (Còn 4-7 ngày)',
        minDaysLeft: 4,
        maxDaysLeft: 7,
        discountPercent: p7,
        categoryId: null,
        productId: null
      })

      // Level 2: 2-3 days
      await createDiscountPolicy({
        name: 'Giảm giá tự động (Còn 2-3 ngày)',
        minDaysLeft: 2,
        maxDaysLeft: 3,
        discountPercent: p3,
        categoryId: null,
        productId: null
      })

      // Level 3: 0-1 days
      await createDiscountPolicy({
        name: 'Giảm giá tự động (Còn 0-1 ngày)',
        minDaysLeft: 0,
        maxDaysLeft: 1,
        discountPercent: p1,
        categoryId: null,
        productId: null
      })

      showToast('Đã thiết lập chiến lược giảm giá 7-3-1 thành công!')
      await loadPolicies()
    } catch (err) {
      showToast('Lỗi khi thiết lập chiến lược: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
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

                  {form.applyType === 'all' && (
                    <div className="sapolicy-form-field full-width">
                      <div className="template-toggle-wrap">
                        <label className="sapolicy-checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={form.useTemplate731} 
                            onChange={(e) => setForm(prev => ({...prev, useTemplate731: e.target.checked}))} 
                          />
                          <span>Sử dụng mẫu giảm giá nhanh</span>
                        </label>
                      </div>
                      
                      {form.useTemplate731 && (
                        <div className="template-flexible-grid">
                          <div className="template-row header">
                            <span>Mốc thời gian (Ngày còn lại)</span>
                            <span>Mức giảm giá (%)</span>
                          </div>
                          <div className="template-row">
                            <div className="template-input-group">
                              <span className="prefix">Dưới</span>
                              <input type="number" name="d7" value={form.d7 || '7'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">ngày</span>
                            </div>
                            <div className="template-input-group">
                              <input type="number" name="p7" value={form.p7 || '20'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">%</span>
                            </div>
                          </div>
                          <div className="template-row">
                            <div className="template-input-group">
                              <span className="prefix">Dưới</span>
                              <input type="number" name="d3" value={form.d3 || '3'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">ngày</span>
                            </div>
                            <div className="template-input-group">
                              <input type="number" name="p3" value={form.p3 || '50'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">%</span>
                            </div>
                          </div>
                          <div className="template-row">
                            <div className="template-input-group">
                              <span className="prefix">Dưới</span>
                              <input type="number" name="d1" value={form.d1 || '1'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">ngày</span>
                            </div>
                            <div className="template-input-group">
                              <input type="number" name="p1" value={form.p1 || '80'} onChange={handleChange} className="sapolicy-input small" />
                              <span className="suffix">%</span>
                            </div>
                          </div>
                          <p className="template-hint">* Hệ thống sẽ tự động chia khoảng ngày nối tiếp nhau dựa trên các mốc bạn nhập.</p>
                        </div>
                      )}
                    </div>
                  )}

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

                  {!form.useTemplate731 && (
                    <>
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
                    </>
                  )}

                </div>
              </div>
              <div className="sapolicy-modal-footer">
                <button type="submit" className="sapolicy-btn-save">{editMode ? 'Lưu Thay Đổi' : 'Tạo Mới'}</button>
                <button type="button" className="sapolicy-btn-cancel" onClick={closeModal}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
    </div>
  )
}
