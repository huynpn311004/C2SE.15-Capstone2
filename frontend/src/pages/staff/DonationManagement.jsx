import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchDonationOffers,
  createDonationOffer,
  updateDonationOfferStatus,
  fetchDonationRequests,
  updateDonationRequestStatus,
} from '../../services/staffApi'
import './DonationManagement.css'

function getBadgeClass(status) {
  if (status === 'Approved') return 'badge-success'
  if (status === 'Rejected') return 'badge-danger'
  if (status === 'Cancelled') return 'badge-muted'
  return 'badge-warning'
}

function getStatusLabel(status) {
  if (status === 'Pending') return 'Đang Chờ'
  if (status === 'Approved') return 'Đã Duyệt'
  if (status === 'Rejected') return 'Đã Từ Chối'
  if (status === 'Cancelled') return 'Đã Hủy'
  return status
}

export default function DonationManagement() {
  const [offers, setOffers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createForm, setCreateForm] = useState({
    productName: '',
    quantity: '',
    expiryDate: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [offersData, requestsData] = await Promise.all([
        fetchDonationOffers(),
        fetchDonationRequests(),
      ])
      setOffers(offersData)
      setRequests(requestsData)
    } catch (err) {
      console.error('Failed to load donation data:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetCreateForm() {
    setCreateForm({
      productName: '',
      quantity: '',
      expiryDate: '',
      description: '',
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

  async function submitCreateOffer(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.productName.trim()) {
      setCreateError('Tên sản phẩm không được để trống.')
      return
    }

    if (!createForm.quantity.trim() || isNaN(Number(createForm.quantity)) || Number(createForm.quantity) <= 0) {
      setCreateError('Số lượng phải là số lớn hơn 0.')
      return
    }

    if (!createForm.expiryDate) {
      setCreateError('Ngày hết hạn không được để trống.')
      return
    }

    try {
      setIsSubmitting(true)
      const newOffer = await createDonationOffer({
        productName: createForm.productName.trim(),
        quantity: Number(createForm.quantity),
        expiryDate: createForm.expiryDate,
        description: createForm.description.trim(),
      })
      setOffers((prev) => [newOffer, ...prev])
      setCreateSuccess('Đã tạo đề nghị quyên góp thành công!')
      setTimeout(() => closeCreateModal(), 800)
    } catch (err) {
      console.error('Failed to create offer:', err)
      setCreateError(err?.response?.data?.detail || 'Tạo đề nghị quyên góp thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOfferStatusChange(id, newStatus) {
    try {
      await updateDonationOfferStatus(id, newStatus)
      setOffers((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
    } catch (err) {
      console.error('Failed to update offer status:', err)
      alert('Cập nhật trạng thái thất bại')
    }
  }

  async function handleRequestStatusChange(id, newStatus) {
    try {
      await updateDonationRequestStatus(id, newStatus)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
    } catch (err) {
      console.error('Failed to update request status:', err)
      alert('Cập nhật trạng thái thất bại')
    }
  }

  if (loading) {
    return (
      <StaffLayout>
        <div className="donation-page">
          <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải dữ liệu...</div>
        </div>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
    <div className="donation-page">
      {/* TOOLBAR */}
      <div className="donation-toolbar">
        <div className="donation-toolbar-info">
          Hiển thị {offers.length + requests.length} mục
        </div>
        <button
          onClick={openCreateModal}
          className="donation-toolbar-btn"
        >
          + Tạo Đề Nghị Quyên Góp
        </button>
      </div>

      {/* CONTENT GRID */}
      <div className="donation-grid">
        {/* Offer List */}
        <div className="donation-card">
          <h3 className="donation-card-title">Đề Nghị Quyên Góp</h3>
          <div className="donation-list">
            {offers.length > 0 ? (
              offers.map((row) => (
                <div key={row.id} className="donation-item">
                  <div className="donation-item-info">
                    <p className="donation-item-name">{row.productName}</p>
                    <p className="donation-item-detail">
                      Số lượng: {row.quantity} | HSD: {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('vi-VN') : '-'}
                    </p>
                    {row.description && (
                      <p className="donation-item-description">{row.description}</p>
                    )}
                  </div>
                  <div className="donation-item-actions">
                    <span className={`badge ${getBadgeClass(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                    {row.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleOfferStatusChange(row.id, 'Approved')}
                          className="action-btn icon-action-btn btn-approve"
                          title="Duyệt"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOfferStatusChange(row.id, 'Rejected')}
                          className="action-btn icon-action-btn btn-reject"
                          title="Từ chối"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="donation-empty">
                <p>Chưa có đề nghị quyên góp nào.</p>
                <button onClick={openCreateModal} className="donation-empty-btn">
                  Tạo đề nghị đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Request List */}
        <div className="donation-card">
          <h3 className="donation-card-title">Yêu Cầu Nhận Quyên Góp</h3>
          <div className="donation-list">
            {requests.length > 0 ? (
              requests.map((row) => (
                <div key={row.id} className="donation-item">
                  <div className="donation-item-info">
                    <p className="donation-item-name">{row.organization}</p>
                    <p className="donation-item-detail">{row.request}</p>
                  </div>
                  <div className="donation-item-actions">
                    <span className={`badge ${getBadgeClass(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                    {row.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleRequestStatusChange(row.id, 'Approved')}
                          className="action-btn icon-action-btn btn-approve"
                          title="Duyệt"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRequestStatusChange(row.id, 'Rejected')}
                          className="action-btn icon-action-btn btn-reject"
                          title="Từ chối"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="donation-empty">
                <p>Chưa có yêu cầu nhận quyên góp nào.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE OFFER MODAL */}
      {showCreateModal && (
        <div className="donation-modal-overlay" onClick={closeCreateModal}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="donation-modal-header">
              <h3>Tạo Đề Nghị Quyên Góp</h3>
              <button className="donation-modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form className="donation-modal-body" onSubmit={submitCreateOffer}>
              <div className="donation-form-grid">
                <div className="donation-form-column">
                  <div className="donation-form-field">
                    <label>Tên Sản Phẩm <span className="required">*</span></label>
                    <input
                      type="text"
                      name="productName"
                      value={createForm.productName}
                      onChange={handleCreateFormChange}
                      className="donation-input"
                      placeholder="VD: Sữa Tươi Vinamilk 1L"
                      required
                    />
                  </div>
                  <div className="donation-form-field">
                    <label>Số Lượng <span className="required">*</span></label>
                    <input
                      type="number"
                      name="quantity"
                      value={createForm.quantity}
                      onChange={handleCreateFormChange}
                      className="donation-input"
                      placeholder="VD: 20"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="donation-form-column">
                  <div className="donation-form-field">
                    <label>Ngày Hết Hạn <span className="required">*</span></label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={createForm.expiryDate}
                      onChange={handleCreateFormChange}
                      className="donation-input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="donation-form-field donation-form-field-full">
                <label>Mô Tả (Không bắt buộc)</label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateFormChange}
                  className="donation-input donation-textarea"
                  placeholder="Ghi chú thêm về sản phẩm (VD: Điều kiện bảo quản, lý do quyên góp...)"
                  rows={3}
                />
              </div>

              {createError && <p className="donation-error">{createError}</p>}
              {createSuccess && <p className="donation-success">{createSuccess}</p>}

              <div className="donation-form-footer">
                <div className="donation-form-actions">
                  <button type="submit" className="btn-large donation-btn-create" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Đề Nghị'}
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
