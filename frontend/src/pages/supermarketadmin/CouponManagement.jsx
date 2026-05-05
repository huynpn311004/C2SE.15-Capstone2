import { useEffect, useState } from 'react'
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
} from '../../services/couponApi'
import './CouponManagement.css'

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedCoupon, setSelectedCoupon] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [editForm, setEditForm] = useState({
    code: '',
    description: '',
    discountPercent: '',
    minAmount: '',
    maxUses: '',
    validFrom: '',
    validTo: '',
  })

  const [createForm, setCreateForm] = useState({
    code: '',
    description: '',
    discountPercent: '',
    minAmount: '',
    maxUses: '',
    validFrom: '',
    validTo: '',
  })

  useEffect(() => {
    loadCoupons()
  }, [])

  async function loadCoupons() {
    try {
      setLoading(true)
      const data = await fetchCoupons()
      setCoupons(data)
    } catch (err) {
      console.error('Failed to load coupons:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setCreateForm({
      code: '',
      description: '',
      discountPercent: '',
      minAmount: '',
      maxUses: '',
      validFrom: '',
      validTo: '',
    })
    setCreateError('')
    setCreateSuccess('')
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    setCreateError('')
    setCreateSuccess('')
  }

  function handleCreateFormChange(event) {
    const { name, value } = event.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
    setCreateError('')
    setCreateSuccess('')
  }

  async function submitCreateCoupon(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.code.trim()) {
      setCreateError('Mã coupon không được để trống.')
      return
    }
    if (!createForm.discountPercent.trim() || isNaN(Number(createForm.discountPercent))) {
      setCreateError('Phần trăm giảm giá phải là số.')
      return
    }
    if (Number(createForm.discountPercent) < 0 || Number(createForm.discountPercent) > 100) {
      setCreateError('Phần trăm giảm giá phải từ 0 đến 100.')
      return
    }
    if (!createForm.validFrom.trim() || !createForm.validTo.trim()) {
      setCreateError('Ngày bắt đầu và kết thúc không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      await createCoupon({
        code: createForm.code.toUpperCase(),
        description: createForm.description || null,
        discountPercent: Number(createForm.discountPercent),
        minAmount: createForm.minAmount ? Number(createForm.minAmount) : null,
        maxUses: createForm.maxUses ? Number(createForm.maxUses) : null,
        validFrom: createForm.validFrom + 'T00:00:00',
        validTo: createForm.validTo + 'T23:59:59',
      })
      await loadCoupons()
      setCreateSuccess('Tạo coupon thành công.')
      setTimeout(() => closeCreateModal(), 600)
    } catch (err) {
      console.error('Failed to create coupon:', err)
      setCreateError(err?.response?.data?.detail || err?.response?.data?.error || 'Tạo coupon thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openEditModal(coupon) {
    setSelectedCoupon(coupon)
    const validFromDate = coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : ''
    const validToDate = coupon.validTo ? new Date(coupon.validTo).toISOString().split('T')[0] : ''

    setEditForm({
      code: coupon.code,
      description: coupon.description || '',
      discountPercent: String(coupon.discountPercent),
      minAmount: coupon.minAmount ? String(coupon.minAmount) : '',
      maxUses: coupon.maxUses ? String(coupon.maxUses) : '',
      validFrom: validFromDate,
      validTo: validToDate,
    })
    setEditError('')
    setEditSuccess('')
    setShowEditModal(true)
  }

  function closeEditModal() {
    setShowEditModal(false)
    setSelectedCoupon(null)
    setEditError('')
    setEditSuccess('')
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    setEditError('')
    setEditSuccess('')
  }

  async function submitEditCoupon(event) {
    event.preventDefault()
    setEditError('')
    setEditSuccess('')

    if (!editForm.code.trim()) {
      setEditError('Mã coupon không được để trống.')
      return
    }
    if (!editForm.discountPercent.trim() || isNaN(Number(editForm.discountPercent))) {
      setEditError('Phần trăm giảm giá phải là số.')
      return
    }
    if (Number(editForm.discountPercent) < 0 || Number(editForm.discountPercent) > 100) {
      setEditError('Phần trăm giảm giá phải từ 0 đến 100.')
      return
    }
    if (!editForm.validFrom.trim() || !editForm.validTo.trim()) {
      setEditError('Ngày bắt đầu và kết thúc không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      await updateCoupon(selectedCoupon.id, {
        code: editForm.code.toUpperCase(),
        description: editForm.description || null,
        discountPercent: Number(editForm.discountPercent),
        minAmount: editForm.minAmount ? Number(editForm.minAmount) : null,
        maxUses: editForm.maxUses ? Number(editForm.maxUses) : null,
        validFrom: editForm.validFrom + 'T00:00:00',
        validTo: editForm.validTo + 'T23:59:59',
      })
      await loadCoupons()
      setEditSuccess('Cập nhật coupon thành công.')
      setTimeout(() => closeEditModal(), 600)
    } catch (err) {
      console.error('Failed to update coupon:', err)
      setEditError(err?.response?.data?.detail || err?.response?.data?.error || 'Cập nhật coupon thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteCoupon(id) {
    const coupon = coupons.find((item) => item.id === id)
    if (!coupon) return

    const confirmed = window.confirm(`Xóa coupon ${coupon.code}?`)
    if (!confirmed) return

    try {
      await deleteCoupon(id)
      setCoupons((prev) => prev.filter((item) => item.id !== id))
      if (selectedCoupon?.id === id) {
        setSelectedCoupon(null)
      }
    } catch (err) {
      console.error('Failed to delete coupon:', err)
      alert('Xóa coupon thất bại')
    }
  }

  async function handleToggleCoupon(coupon) {
    try {
      await toggleCoupon(coupon.id)
      await loadCoupons()
    } catch (err) {
      console.error('Failed to toggle coupon:', err)
      alert('Bật/tắt coupon thất bại')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const truncateDesc = (text, maxLen = 25) => {
    if (!text) return '-'
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
  }

  function openDetailModal(coupon) {
    setSelectedCoupon(coupon)
    setShowDetailModal(true)
  }

  function closeDetailModal() {
    setShowDetailModal(false)
    setSelectedCoupon(null)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ'
  }

  if (loading) {
    return (
      <div className="coupon-page">
        <p>Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="coupon-page">
      {/* TOOLBAR */}
      <div className="coupon-toolbar">
        <div className="coupon-toolbar-info">
          {loading ? 'Đang tải...' : `Hiển thị ${coupons.length} mã ưu đãi`}
        </div>
        <button className="coupon-toolbar-btn" onClick={openCreateModal}>
          Tạo mã ưu đãi
        </button>
      </div>

      {/* CARD */}
      <div className="coupon-card">
        <div className="table-responsive">
          <table className="table-coupon">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Mô Tả</th>
                <th>Giảm Giá</th>
                <th>Giá Tối Thiểu</th>
                <th>Số Lần Dùng</th>
                <th>Hiệu Lực</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length > 0 ? (
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <span className="coupon-code">{coupon.code}</span>
                    </td>
                    <td>
                      <span
                        className="coupon-desc-cell"
                        title={coupon.description || ''}
                      >
                        {truncateDesc(coupon.description)}
                      </span>
                    </td>
                    <td>{coupon.discountPercent}%</td>
                    <td>{coupon.minAmount ? formatPrice(coupon.minAmount) : '-'}</td>
                    <td>
                      {coupon.maxUses ? `${coupon.currentUses}/${coupon.maxUses}` : `${coupon.currentUses}/∞`}
                    </td>
                    <td>
                      {formatDate(coupon.validFrom)} → {formatDate(coupon.validTo)}
                    </td>
                    <td>
                      <span className={`badge-coupon ${coupon.isActive ? 'badge-coupon-active' : 'badge-coupon-inactive'}`}>
                        {coupon.isActive ? 'Kích hoạt' : 'Tắt'}
                      </span>
                    </td>
                    <td>
                      <div className="coupon-actions">
                        <button
                          type="button"
                          className="coupon-btn-detail"
                          onClick={() => openDetailModal(coupon)}
                          title="Xem chi tiết"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="coupon-btn-edit"
                          onClick={() => openEditModal(coupon)}
                          title="Chỉnh sửa"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="coupon-btn-delete"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          title="Xóa"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                          Xóa
                        </button>
                        <button
                          type="button"
                          className="coupon-btn-toggle"
                          onClick={() => handleToggleCoupon(coupon)}
                          title={coupon.isActive ? 'Tắt coupon' : 'Bật coupon'}
                        >
                          {coupon.isActive ? '⏸' : '▶'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell-coupon">
                    Không có mã ưu đãi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && selectedCoupon && (
        <div className="coupon-modal-overlay" onClick={closeEditModal}>
          <div className="coupon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3>Chỉnh Sửa Mã Ưu Đãi</h3>
              <button className="coupon-modal-close" onClick={closeEditModal}>×</button>
            </div>
            <form onSubmit={submitEditCoupon}>
              <div className="coupon-modal-body">
                <div className="coupon-form-grid">
                  <label className="coupon-field">
                    <span>Mã Coupon <em>*</em></span>
                    <input
                      type="text"
                      name="code"
                      value={editForm.code}
                      onChange={handleEditFormChange}
                      placeholder="VD: GIAM20"
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Mô Tả</span>
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditFormChange}
                      placeholder="Nhập mô tả cho coupon"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Phần Trăm Giảm Giá (%) <em>*</em></span>
                    <input
                      type="number"
                      name="discountPercent"
                      value={editForm.discountPercent}
                      onChange={handleEditFormChange}
                      placeholder="0-100"
                      min="0"
                      max="100"
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Giá Tối Thiểu (Đ)</span>
                    <input
                      type="number"
                      name="minAmount"
                      value={editForm.minAmount}
                      onChange={handleEditFormChange}
                      placeholder="Để trống = không giới hạn"
                      min="0"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Số Lần Dùng Tối Đa</span>
                    <input
                      type="number"
                      name="maxUses"
                      value={editForm.maxUses}
                      onChange={handleEditFormChange}
                      placeholder="Để trống = không giới hạn"
                      min="1"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Ngày Bắt Đầu <em>*</em></span>
                    <input
                      type="date"
                      name="validFrom"
                      value={editForm.validFrom}
                      onChange={handleEditFormChange}
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Ngày Kết Thúc <em>*</em></span>
                    <input
                      type="date"
                      name="validTo"
                      value={editForm.validTo}
                      onChange={handleEditFormChange}
                      required
                    />
                  </label>
                </div>
                {editError && <p className="coupon-error">{editError}</p>}
              </div>
              <div className="coupon-modal-footer">
                <button type="button" className="coupon-btn-cancel" onClick={closeEditModal}>
                  Hủy
                </button>
                <button type="submit" className="coupon-btn-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="coupon-modal-overlay" onClick={closeCreateModal}>
          <div className="coupon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3>Tạo Mã Ưu Đãi Mới</h3>
              <button className="coupon-modal-close" onClick={closeCreateModal}>×</button>
            </div>
            <form onSubmit={submitCreateCoupon}>
              <div className="coupon-modal-body">
                <div className="coupon-form-grid">
                  <label className="coupon-field">
                    <span>Mã Coupon <em>*</em></span>
                    <input
                      type="text"
                      name="code"
                      value={createForm.code}
                      onChange={handleCreateFormChange}
                      placeholder="VD: GIAM20"
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Mô Tả</span>
                    <textarea
                      name="description"
                      value={createForm.description}
                      onChange={handleCreateFormChange}
                      placeholder="Nhập mô tả cho coupon"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Phần Trăm Giảm Giá (%) <em>*</em></span>
                    <input
                      type="number"
                      name="discountPercent"
                      value={createForm.discountPercent}
                      onChange={handleCreateFormChange}
                      placeholder="0-100"
                      min="0"
                      max="100"
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Giá Tối Thiểu (Đ)</span>
                    <input
                      type="number"
                      name="minAmount"
                      value={createForm.minAmount}
                      onChange={handleCreateFormChange}
                      placeholder="Để trống = không giới hạn"
                      min="0"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Số Lần Dùng Tối Đa</span>
                    <input
                      type="number"
                      name="maxUses"
                      value={createForm.maxUses}
                      onChange={handleCreateFormChange}
                      placeholder="Để trống = không giới hạn"
                      min="1"
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Ngày Bắt Đầu <em>*</em></span>
                    <input
                      type="date"
                      name="validFrom"
                      value={createForm.validFrom}
                      onChange={handleCreateFormChange}
                      required
                    />
                  </label>
                  <label className="coupon-field">
                    <span>Ngày Kết Thúc <em>*</em></span>
                    <input
                      type="date"
                      name="validTo"
                      value={createForm.validTo}
                      onChange={handleCreateFormChange}
                      required
                    />
                  </label>
                </div>
                {createError && <p className="coupon-error">{createError}</p>}
              </div>
              <div className="coupon-modal-footer">
                <button type="button" className="coupon-btn-cancel" onClick={closeCreateModal}>
                  Hủy
                </button>
                <button type="submit" className="coupon-btn-save" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang tạo...' : 'Tạo Mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedCoupon && (
        <div className="coupon-modal-overlay" onClick={closeDetailModal}>
          <div className="coupon-modal coupon-modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3>Chi Tiết Mã Ưu Đãi</h3>
              <button className="coupon-modal-close" onClick={closeDetailModal}>×</button>
            </div>
            <div className="coupon-modal-body">
              <div className="coupon-form-grid">
                <label className="coupon-field">
                  <span>Mã Coupon</span>
                  <input
                    type="text"
                    value={selectedCoupon.code}
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field">
                  <span>Phần Trăm Giảm Giá (%)</span>
                  <input
                    type="number"
                    value={selectedCoupon.discountPercent}
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field">
                  <span>Giá Tối Thiểu (Đ)</span>
                  <input
                    type="number"
                    value={selectedCoupon.minAmount || ''}
                    placeholder="Không giới hạn"
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field">
                  <span>Số Lần Dùng Tối Đa</span>
                  <input
                    type="number"
                    value={selectedCoupon.maxUses || ''}
                    placeholder="Không giới hạn"
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field">
                  <span>Ngày Bắt Đầu</span>
                  <input
                    type="date"
                    value={selectedCoupon.validFrom ? new Date(selectedCoupon.validFrom).toISOString().split('T')[0] : ''}
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field">
                  <span>Ngày Kết Thúc</span>
                  <input
                    type="date"
                    value={selectedCoupon.validTo ? new Date(selectedCoupon.validTo).toISOString().split('T')[0] : ''}
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
                <label className="coupon-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Mô Tả</span>
                  <textarea
                    value={selectedCoupon.description || ''}
                    placeholder="Không có mô tả"
                    readOnly
                    className="coupon-input-readonly"
                  />
                </label>
              </div>
            </div>
            <div className="coupon-modal-footer">
              <button type="button" className="coupon-btn-cancel" onClick={closeDetailModal}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
