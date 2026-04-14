import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchDonationOffers,
  createBulkDonationOffers,
  updateDonationOfferStatus,
  fetchDonationRequests,
  updateDonationRequestStatus,
  fetchInventoryLotsForDonation,
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
  const [inventoryLots, setInventoryLots] = useState([])
  const [loadingLots, setLoadingLots] = useState(false)

  // selectedItems: array of { lotId, quantity }
  const [selectedItems, setSelectedItems] = useState([])

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

  async function loadInventoryLots() {
    setLoadingLots(true)
    try {
      const lots = await fetchInventoryLotsForDonation()
      // Chỉ lấy những lot có số lượng > 0
      const availableLots = lots.filter(lot => lot.quantity > 0)
      setInventoryLots(availableLots)
    } catch (err) {
      console.error('Failed to load inventory lots:', err)
    } finally {
      setLoadingLots(false)
    }
  }

  function openCreateModal() {
    loadInventoryLots()
    setSelectedItems([])
    setCreateError('')
    setCreateSuccess('')
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    setSelectedItems([])
    setCreateError('')
    setCreateSuccess('')
  }

  function handleLotCheckboxChange(lotId, checked) {
    setSelectedItems(prev => {
      if (checked) {
        // Thêm lot mới với số lượng mặc định là 1
        const lot = inventoryLots.find(l => l.id === lotId)
        return [...prev, { lotId, quantity: 1, productName: lot?.productName || '', expiryDate: lot?.expiryDate || '' }]
      } else {
        // Xóa lot
        return prev.filter(item => item.lotId !== lotId)
      }
    })
    setCreateError('')
    setCreateSuccess('')
  }

  function handleQuantityChange(lotId, newQty) {
    setSelectedItems(prev =>
      prev.map(item =>
        item.lotId === lotId ? { ...item, quantity: newQty } : item
      )
    )
  }

  async function submitCreateOffer(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (selectedItems.length === 0) {
      setCreateError('Vui lòng chọn ít nhất 1 sản phẩm.')
      return
    }

    // Validate từng item
    for (const item of selectedItems) {
      const lot = inventoryLots.find(l => l.id === item.lotId)
      if (!lot) {
        setCreateError(`Sản phẩm không hợp lệ (ID: ${item.lotId}).`)
        return
      }
      const qty = Number(item.quantity)
      if (!qty || qty <= 0) {
        setCreateError(`Số lượng cho ${lot.productName} phải > 0.`)
        return
      }
      if (qty > lot.quantity) {
        setCreateError(`Số lượng cho ${lot.productName} vượt quá tồn kho (còn lại: ${lot.quantity}).`)
        return
      }
    }

    try {
      setIsSubmitting(true)
      const payload = selectedItems.map(item => ({
        lot_id: item.lotId,
        offered_qty: Number(item.quantity),
      }))

      const result = await createBulkDonationOffers(payload)
      // Reload offers list
      await loadData()
      setCreateSuccess(`Đã tạo ${result.created || selectedItems.length} đề nghị quyên góp thành công!`)
      setTimeout(() => closeCreateModal(), 1000)
    } catch (err) {
      console.error('Failed to create offers:', err)
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        setCreateError(detail.map(e => e.message).join('; '))
      } else {
        setCreateError(detail || 'Tạo đề nghị quyên góp thất bại.')
      }
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
          Tạo Đề Nghị Quyên Góp
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
                      Số lượng: {row.remainingQty || row.offeredQty} | HSD: {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('vi-VN') : '-'}
                    </p>
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

      {/* CREATE OFFER MODAL - BULK SELECT */}
      {showCreateModal && (
        <div className="donation-modal-overlay" onClick={closeCreateModal}>
          <div className="donation-modal donation-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="donation-modal-header">
              <h3>Tạo Đề Nghị Quyên Góp (Nhiều Sản Phẩm)</h3>
              <button className="donation-modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form className="donation-modal-body" onSubmit={submitCreateOffer}>
              {/* Product Selection Table */}
              <div className="donation-selection-section">
                <div className="donation-selection-header">
                  <h4>Chọn Sản Phẩm Từ Kho Hàng</h4>
                  <span className="donation-selection-hint">
                    Đánh dấu ✓ các sản phẩm muốn donate, nhập số lượng
                  </span>
                </div>

                {loadingLots ? (
                  <div className="donation-loading">Đang tải danh sách sản phẩm...</div>
                ) : inventoryLots.length === 0 ? (
                  <div className="donation-empty-state">Không có sản phẩm nào trong kho</div>
                ) : (
                  <div className="donation-product-grid">
                    {inventoryLots.map((lot) => {
                      const isSelected = selectedItems.some(item => item.lotId === lot.id)
                      return (
                        <div
                          key={lot.id}
                          className={`donation-product-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleLotCheckboxChange(lot.id, !isSelected)}
                        >
                          <div className="donation-product-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleLotCheckboxChange(lot.id, e.target.checked)
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="donation-product-info">
                            <p className="donation-product-name">{lot.productName}</p>
                            <p className="donation-product-lot">Lô: {lot.lotCode}</p>
                            <p className="donation-product-expiry">
                              HSD: {new Date(lot.expiryDate).toLocaleDateString('vi-VN')}
                            </p>
                            <p className="donation-product-stock">
                              Tồn kho: <strong>{lot.quantity}</strong>
                            </p>
                          </div>
                          {isSelected && (
                            <div className="donation-product-quantity">
                              <label>Số lượng:</label>
                              <input
                                type="number"
                                min="1"
                                max={lot.quantity}
                                value={selectedItems.find(i => i.lotId === lot.id)?.quantity || 1}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handleQuantityChange(lot.id, e.target.value)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="donation-quantity-input"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Items Summary */}
              {selectedItems.length > 0 && (
                <div className="donation-selected-summary">
                  <h4>Đã chọn {selectedItems.length} sản phẩm:</h4>
                  <ul>
                    {selectedItems.map((item) => {
                      const lot = inventoryLots.find(l => l.id === item.lotId)
                      return (
                        <li key={item.lotId}>
                          <span className="selected-item-name">{lot?.productName}</span>
                          <span className="selected-item-lot">({lot?.lotCode})</span>
                          <span className="selected-item-qty">x{item.quantity}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {createError && <p className="donation-error">{createError}</p>}
              {createSuccess && <p className="donation-success">{createSuccess}</p>}

              <div className="donation-form-footer">
                <div className="donation-form-actions">
                  <button
                    type="submit"
                    className="btn-large donation-btn-create"
                    disabled={isSubmitting || selectedItems.length === 0}
                  >
                    {isSubmitting ? 'Đang tạo...' : `Tạo ${selectedItems.length} Đề Nghị`}
                  </button>
                  <button
                    type="button"
                    className="btn-large btn-close"
                    onClick={closeCreateModal}
                  >
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
