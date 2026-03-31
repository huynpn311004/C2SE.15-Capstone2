import { useEffect, useState } from 'react'
import {
  fetchDiscountPolicies,
  createDiscountPolicy,
  updateDiscountPolicy,
  deleteDiscountPolicy,
  toggleDiscountPolicy,
} from '../../services/discountPolicyApi'
import './PolicyConfiguration.css'

export default function PolicyConfiguration() {
  const [policies, setPolicies] = useState([])
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
  })

  useEffect(() => {
    loadPolicies()
  }, [])

  async function loadPolicies() {
    try {
      setLoading(true)
      setError('')
      const data = await fetchDiscountPolicies()
      setPolicies(data)
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách chính sách')
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditMode(false)
    setSelectedPolicy(null)
    setForm({ name: '', minDaysLeft: '', maxDaysLeft: '', discountPercent: '' })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function openEditModal(policy) {
    setEditMode(true)
    setSelectedPolicy(policy)
    setForm({
      name: policy.name,
      minDaysLeft: String(policy.minDaysLeft),
      maxDaysLeft: String(policy.maxDaysLeft),
      discountPercent: String(policy.discountPercent),
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

    try {
      if (editMode && selectedPolicy) {
        await updateDiscountPolicy(selectedPolicy.id, {
          name: form.name.trim(),
          minDaysLeft: minDays,
          maxDaysLeft: maxDays,
          discountPercent: discount,
        })
        setSuccess('Cập nhật chính sách thành công!')
      } else {
        await createDiscountPolicy({
          name: form.name.trim(),
          minDaysLeft: minDays,
          maxDaysLeft: maxDays,
          discountPercent: discount,
        })
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
          Cấu hình chính sách giảm giá cho sản phẩm sắp hết hạn
        </div>
        <button className="sapolicy-btn-create" onClick={openCreateModal}>
          Thêm Chính Sách
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="sapolicy-alert sapolicy-alert-error">
          <span>❌</span> {error}
          <button onClick={() => setError('')} className="sapolicy-alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="sapolicy-alert sapolicy-alert-success">
          <span>✅</span> {success}
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
                  <th>SỐ NGÀY ÁP DỤNG</th>
                  <th>GIẢM GIÁ</th>
                  <th>VÍ DỤ (100.000đ)</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(policy => (
                  <tr key={policy.id} className={!policy.isActive ? 'row-inactive' : ''}>
                    <td>
                      <span className="sapolicy-name">{policy.name}</span>
                    </td>
                    <td>
                      <span className="sapolicy-days">
                        Còn {policy.minDaysLeft} - {policy.maxDaysLeft} ngày
                      </span>
                    </td>
                    <td>
                      <span className="sapolicy-discount">-{policy.discountPercent}%</span>
                    </td>
                    <td>
                      <span className="sapolicy-example">
                        {Math.round(100000 * (1 - policy.discountPercent / 100)).toLocaleString()}đ
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(policy.isActive)}`}>
                        {getStatusLabel(policy.isActive)}
                      </span>
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          className="action-btn icon-action-btn btn-toggle"
                          onClick={() => handleToggle(policy)}
                          title={policy.isActive ? 'Tắt chính sách' : 'Bật chính sách'}
                        >
                          {policy.isActive ? '⏸' : '▶'}
                        </button>
                        <button
                          className="action-btn icon-action-btn btn-edit"
                          onClick={() => openEditModal(policy)}
                          title="Chỉnh sửa"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" />
                          </svg>
                        </button>
                        <button
                          className="action-btn icon-action-btn btn-delete-small"
                          onClick={() => handleDelete(policy)}
                          title="Xóa chính sách"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <button className="sapolicy-modal-close" onClick={closeModal}>✕</button>
            </div>

            <form className="sapolicy-modal-body" onSubmit={handleSubmit}>
              <div className="sapolicy-form-grid">
                <div className="sapolicy-form-column">
                  <div className="sapolicy-form-field">
                    <label>Tên Chính Sách *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="VD: Giảm giá sắp hết hạn"
                      className="sapolicy-input"
                      required
                    />
                  </div>
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
                </div>

                <div className="sapolicy-form-column">
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
              </div>

              {error && <div className="sapolicy-form-error">{error}</div>}
              {success && <div className="sapolicy-form-success">{success}</div>}

              <div className="sapolicy-form-footer">
                <div className="sapolicy-form-actions">
                  <button type="button" className="btn-large btn-close" onClick={closeModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-large sapolicy-btn-save">
                    {editMode ? 'Lưu Thay Đổi' : 'Tạo Mới'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
