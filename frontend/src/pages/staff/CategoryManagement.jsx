import { useEffect, useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../services/staffApi'
import './CategoryManagement.css'

export default function CategoryManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({ name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      setLoading(true)
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError('Không thể tải danh sách danh mục')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingCategory(null)
    setFormData({ name: '' })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
    setFormData({ name: category.name })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({ name: '' })
    setError('')
  }

  function handleInputChange(e) {
    setFormData({ name: e.target.value })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Tên danh mục không được để trống')
      return
    }

    try {
      setSaving(true)
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData)
        setSuccess('Cập nhật danh mục thành công')
      } else {
        await createCategory(formData)
        setSuccess('Tạo danh mục thành công')
      }
      await loadCategories()
      setTimeout(() => closeModal(), 800)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete(category) {
    try {
      await deleteCategory(category.id)
      setSuccess('Xóa danh mục thành công')
      await loadCategories()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Xóa thất bại')
    }
    setDeleteConfirm(null)
  }

  return (
    <StaffLayout>
      <div className="category-page">
        <div className="category-card">
          <div className="category-card-header">
            <h2>Quản Lý Danh Mục Sản Phẩm</h2>
            <button className="category-btn-add" onClick={openAddModal}>
              <span className="category-icon">+</span>
              Thêm Danh Mục
            </button>
          </div>

          {error && <div className="category-alert category-alert-error">{error}</div>}
          {success && <div className="category-alert category-alert-success">{success}</div>}

          {loading ? (
            <div className="category-loading">Đang tải danh sách danh mục...</div>
          ) : (
            <div className="category-table-wrapper">
              <table className="category-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên Danh Mục</th>
                    <th>Số Sản Phẩm</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="category-empty">
                        Chưa có danh mục nào. Hãy thêm danh mục đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat, index) => (
                      <tr key={cat.id}>
                        <td>{index + 1}</td>
                        <td>{cat.name}</td>
                        <td>
                          <span className="category-count-badge">{cat.productCount}</span>
                        </td>
                        <td className="category-actions">
                          <button
                            className="category-btn-edit"
                            onClick={() => openEditModal(cat)}
                          >
                            <svg className="category-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Sửa
                          </button>
                          <button
                            className="category-btn-delete"
                            onClick={() => setDeleteConfirm(cat)}
                          >
                            <svg className="category-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="category-modal-overlay" onClick={closeModal}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header">
              <h3>{editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</h3>
              <button className="category-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="category-modal-body">
                <label className="category-field">
                  <span>Tên Danh Mục</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên danh mục sản phẩm"
                    autoFocus
                  />
                </label>
                {error && <p className="category-error">{error}</p>}
              </div>
              <div className="category-modal-footer">
                <button type="button" className="category-btn-cancel" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="category-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingCategory ? 'Cập Nhật' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {deleteConfirm && (
        <div className="category-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="category-modal category-modal-delete" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header">
              <h3>Xác Nhận Xóa Danh Mục</h3>
              <button className="category-modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="category-modal-body">
              <p className="category-delete-text">
                Bạn có chắc muốn xóa danh mục "<strong>{deleteConfirm.name}</strong>" không?
              </p>
              {deleteConfirm.productCount > 0 && (
                <p className="category-warning">
                  Cảnh báo: Có {deleteConfirm.productCount} sản phẩm đang sử dụng danh mục này. Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa.
                </p>
              )}
            </div>
            <div className="category-modal-footer">
              <button
                type="button"
                className="category-btn-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="category-btn-confirm-delete"
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
