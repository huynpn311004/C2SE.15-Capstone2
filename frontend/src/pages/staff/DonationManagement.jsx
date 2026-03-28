import { useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './DonationManagement.css'

const offerSeed = [
  { id: 1, product: 'Combo Bánh Mì', quantity: 18, status: 'Đang Chờ', expiryDate: '2026-04-05', store: 'BigMart Q1' },
  { id: 2, product: 'Gói Trái Cây', quantity: 12, status: 'Đã Duyệt', expiryDate: '2026-04-10', store: 'BigMart Q1' },
]

const requestSeed = [
  { id: 11, organization: 'Quỹ Hy Vọng', request: 'Sữa Tươi 1L x 20', status: 'Đang Chờ' },
  { id: 12, organization: 'Green Hands', request: 'Gói Snack x 30', status: 'Đang Chờ' },
]

function getBadgeClass(status) {
  if (status === 'Đã Duyệt') return 'badge-success'
  if (status === 'Đã Từ Chối') return 'badge-danger'
  if (status === 'Đã Hủy') return 'badge-muted'
  return 'badge-warning'
}

export default function DonationManagement() {
  const [offers, setOffers] = useState(offerSeed)
  const [requests, setRequests] = useState(requestSeed)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [createForm, setCreateForm] = useState({
    productName: '',
    quantity: '',
    expiryDate: '',
    description: '',
    store: 'BigMart Q1',
  })

  function resetCreateForm() {
    setCreateForm({
      productName: '',
      quantity: '',
      expiryDate: '',
      description: '',
      store: 'BigMart Q1',
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

  function submitCreateOffer(event) {
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

    const newOffer = {
      id: Date.now(),
      product: createForm.productName.trim(),
      quantity: Number(createForm.quantity),
      expiryDate: createForm.expiryDate,
      store: createForm.store,
      description: createForm.description.trim(),
      status: 'Đang Chờ',
    }

    setOffers((prev) => [newOffer, ...prev])
    setCreateSuccess('Đã tạo đề nghị quyên góp thành công!')

    setTimeout(() => {
      closeCreateModal()
    }, 800)
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
                    <p className="donation-item-name">{row.product}</p>
                    <p className="donation-item-detail">
                      Số lượng: {row.quantity} | HSD: {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('vi-VN') : '-'}
                    </p>
                    {row.description && (
                      <p className="donation-item-description">{row.description}</p>
                    )}
                  </div>
                  <div className="donation-item-actions">
                    <span className={`badge ${getBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                    {row.status === 'Đang Chờ' && (
                      <>
                        <button
                          onClick={() => setOffers((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Đã Duyệt' } : r))}
                          className="action-btn icon-action-btn btn-approve"
                          title="Duyệt"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setOffers((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Đã Từ Chối' } : r))}
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
                      {row.status}
                    </span>
                    {row.status === 'Đang Chờ' && (
                      <>
                        <button
                          onClick={() => setRequests((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Đã Duyệt' } : r))}
                          className="action-btn icon-action-btn btn-approve"
                          title="Duyệt"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setRequests((prev) => prev.map((r) => r.id === row.id ? { ...r, status: 'Đã Từ Chối' } : r))}
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
                  <div className="donation-form-field">
                    <label>Cửa Hàng</label>
                    <select
                      name="store"
                      value={createForm.store}
                      onChange={handleCreateFormChange}
                      className="donation-input"
                    >
                      <option value="BigMart Q1">BigMart Q1</option>
                      <option value="BigMart Q3">BigMart Q3</option>
                      <option value="BigMart Q5">BigMart Q5</option>
                      <option value="BigMart Q7">BigMart Q7</option>
                    </select>
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
                  <button type="submit" className="btn-large donation-btn-create">
                    Tạo Đề Nghị
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
