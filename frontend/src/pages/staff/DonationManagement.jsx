import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import {
  fetchDonationOffers,
  createBulkDonationOffers,
  updateDonationOfferStatus,
  updateDonationOffer,
  deleteDonationOffer,
  fetchDonationRequests,
  fetchDonationRequestDetail,
  updateDonationRequestStatus,
  fetchInventoryLotsForDonation,
} from '../../services/staffApi'
import './DonationManagement.css'

function getBadgeClass(status) {
  if (status === 'open') return 'badge-warning'
  if (status === 'PENDING') return 'badge-warning'
  if (status === 'APPROVED') return 'badge-success'
  if (status === 'REJECTED') return 'badge-danger'
  if (status === 'RECEIVED') return 'badge-success'
  if (status === 'Cancelled') return 'badge-muted'
  return 'badge-muted'
}

function getStatusLabel(status) {
  if (status === 'open') return 'Mở'
  if (status === 'PENDING') return 'Đang Chờ'
  if (status === 'APPROVED') return 'Đã Duyệt'
  if (status === 'REJECTED') return 'Đã Từ Chối'
  if (status === 'RECEIVED') return 'Đã Nhận'
  if (status === 'Cancelled') return 'Đã Hủy'
  return status
}

export default function DonationManagement() {
  const [offers, setOffers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inventoryLots, setInventoryLots] = useState([])
  const [loadingLots, setLoadingLots] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // selectedItems: array of { lotId, quantity }
  const [selectedItems, setSelectedItems] = useState([])

  // State for editing donation offers
  const [editingOfferId, setEditingOfferId] = useState(null)
  const [editQuantity, setEditQuantity] = useState(1)

  useEffect(() => {
    loadData()
  }, [statusFilter])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  async function loadData() {
    try {
      setLoading(true)
      const [offersData, requestsData] = await Promise.all([
        fetchDonationOffers(),
        fetchDonationRequests(statusFilter),
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
      const availableLots = lots.filter(lot => lot.quantity > 0)
      setInventoryLots(availableLots)
    } catch (err) {
      console.error('Failed to load inventory lots:', err)
    } finally {
      setLoadingLots(false)
    }
  }

  // ========== Request Detail Modal ==========
  async function openRequestDetail(requestId) {
    setLoadingDetail(true)
    setShowDetailModal(true)
    try {
      const detail = await fetchDonationRequestDetail(requestId)
      setSelectedRequest(detail)
    } catch (err) {
      console.error('Failed to load request detail:', err)
      setError('Không thể tải chi tiết yêu cầu')
      setShowDetailModal(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeRequestDetail() {
    setShowDetailModal(false)
    setSelectedRequest(null)
  }

  async function handleApproveRequest(requestId) {
    if (!confirm('Bạn có chắc muốn duyệt yêu cầu này?')) return
    try {
      await updateDonationRequestStatus(requestId, 'APPROVED')
      setSuccess('Đã duyệt yêu cầu thành công!')
      closeRequestDetail()
      loadData()
    } catch (err) {
      console.error('Failed to approve request:', err)
      const detail = err?.response?.data?.detail || 'Duyệt thất bại'
      setError(detail)
    }
  }

  async function handleRejectRequest(requestId) {
    if (!confirm('Bạn có chắc muốn từ chối yêu cầu này?')) return
    try {
      await updateDonationRequestStatus(requestId, 'REJECTED')
      setSuccess('Đã từ chối yêu cầu!')
      closeRequestDetail()
      loadData()
    } catch (err) {
      console.error('Failed to reject request:', err)
      const detail = err?.response?.data?.detail || 'Từ chối thất bại'
      setError(detail)
    }
  }

  function openCreateModal() {
    loadInventoryLots()
    setSelectedItems([])
    setError('')
    setSuccess('')
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    setShowCreateModal(false)
    setSelectedItems([])
    setError('')
    setSuccess('')
  }

  function handleLotCheckboxChange(lotId, checked) {
    setSelectedItems(prev => {
      if (checked) {
        const lot = inventoryLots.find(l => l.id === lotId)
        return [...prev, { lotId, quantity: 1, productName: lot?.productName || '', expiryDate: lot?.expiryDate || '' }]
      } else {
        return prev.filter(item => item.lotId !== lotId)
      }
    })
    setError('')
    setSuccess('')
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
    setError('')
    setSuccess('')

    if (selectedItems.length === 0) {
      setError('Vui lòng chọn ít nhất 1 sản phẩm.')
      return
    }

    for (const item of selectedItems) {
      const lot = inventoryLots.find(l => l.id === item.lotId)
      if (!lot) {
        setError(`Sản phẩm không hợp lệ (ID: ${item.lotId}).`)
        return
      }
      const qty = Number(item.quantity)
      if (!qty || qty <= 0) {
        setError(`Số lượng cho ${lot.productName} phải > 0.`)
        return
      }
      if (qty > lot.quantity) {
        setError(`Số lượng cho ${lot.productName} vượt quá tồn kho (còn lại: ${lot.quantity}).`)
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
      await loadData()
      setSuccess(`Đã tạo ${result.created || selectedItems.length} đề nghị quyên góp thành công!`)
      setTimeout(() => closeCreateModal(), 1500)
    } catch (err) {
      console.error('Failed to create offers:', err)
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.message).join('; '))
      } else {
        setError(detail || 'Tạo đề nghị quyên góp thất bại.')
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
      setError('Cập nhật trạng thái thất bại')
    }
  }

  function startEditOffer(offer) {
    setEditingOfferId(offer.id)
    setEditQuantity(offer.remainingQty || offer.offeredQty)
  }

  function cancelEditOffer() {
    setEditingOfferId(null)
    setEditQuantity(1)
  }

  async function saveEditOffer(offerId) {
    try {
      await updateDonationOffer(offerId, Number(editQuantity))
      await loadData()
      setEditingOfferId(null)
      setEditQuantity(1)
      setSuccess('Đã cập nhật số lượng thành công!')
    } catch (err) {
      console.error('Failed to update offer:', err)
      const detail = err?.response?.data?.detail || 'Cập nhật thất bại'
      setError(detail)
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!confirm('Bạn có chắc muốn xóa đề nghị quyên góp này?')) {
      return
    }
    try {
      await deleteDonationOffer(offerId)
      setOffers((prev) => prev.filter((r) => r.id !== offerId))
      setSuccess('Đã xóa đề nghị quyên góp!')
    } catch (err) {
      console.error('Failed to delete offer:', err)
      const detail = err?.response?.data?.detail || 'Xóa thất bại'
      setError(detail)
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="donation-filter-select"
          >
            <option value="all">Tất cả</option>
            <option value="PENDING">Đang chờ</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="RECEIVED">Đã nhận</option>
          </select>
          <span> | Hiển thị {offers.length + requests.length} mục</span>
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
                    {editingOfferId === row.id ? (
                      <>
                        <div className="edit-quantity-form">
                          <input
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="edit-quantity-input"
                          />
                          <button
                            onClick={() => saveEditOffer(row.id)}
                            className="donation-btn-edit"
                            title="Lưu"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={cancelEditOffer}
                            className="donation-btn-delete"
                            title="Hủy"
                          >
                            Hủy
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {row.status !== 'open' && (
                          <span className={`badge ${getBadgeClass(row.status)}`}>
                            {getStatusLabel(row.status)}
                          </span>
                        )}
                        {row.status === 'open' && (
                          <>
                            <button
                              onClick={() => startEditOffer(row)}
                              className="donation-btn-edit"
                              title="Sửa số lượng"
                            >
                              <svg className="donation-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteOffer(row.id)}
                              className="donation-btn-delete"
                              title="Xóa"
                            >
                              <svg className="donation-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                              Xóa
                            </button>
                          </>
                        )}
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

        {/* Request List (New Architecture) */}
        <div className="donation-card">
          <h3 className="donation-card-title">Yêu Cầu Nhận Quyên Góp</h3>
          <div className="donation-list">
            {requests.length > 0 ? (
              requests.map((row) => (
                <div key={row.id} className="donation-item">
                  <div className="donation-item-info">
                    <p className="donation-item-name">
                      <strong>{row.organization || row.charityName}</strong>
                      {row.charityPhone && (
                        <span className="donation-charity-phone"> | {row.charityPhone}</span>
                      )}
                    </p>
                    {row.charityAddress && (
                      <p className="donation-charity-address">{row.charityAddress}</p>
                    )}
                    <p className="donation-item-detail">
                      {row.total_items} sản phẩm
                    </p>
                    <p className="donation-item-meta">Mã yêu cầu: #{row.id} | Ngày: {row.createdAt}</p>
                  </div>
                  <div className="donation-item-actions">
                    <span className={`badge ${getBadgeClass(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                    <button
                      onClick={() => openRequestDetail(row.id)}
                      className="donation-btn-detail"
                      title="Xem chi tiết"
                    >
                      Xem
                    </button>
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

      {/* REQUEST DETAIL MODAL */}
      {showDetailModal && (
        <div className="donation-modal-overlay" onClick={closeRequestDetail}>
          <div className="donation-modal donation-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="donation-modal-header">
              <h3>Chi Tiết Yêu Cầu Quyên Góp #{selectedRequest?.id}</h3>
              <button className="donation-modal-close" onClick={closeRequestDetail}>✕</button>
            </div>
            <div className="donation-modal-body">
              {loadingDetail ? (
                <div className="donation-loading">Đang tải chi tiết...</div>
              ) : selectedRequest ? (
                <>
                  {/* Request Info */}
                  <div className="request-detail-section">
                    <div className="request-detail-grid">
                      <div className="request-detail-item">
                        <span className="label">Tên tổ chức:</span>
                        <span className="value">{selectedRequest.charity_org_name || selectedRequest.charity_name}</span>
                      </div>
                      <div className="request-detail-item">
                        <span className="label">Số điện thoại:</span>
                        <span className="value">{selectedRequest.charity_phone || '-'}</span>
                      </div>
                      <div className="request-detail-item">
                        <span className="label">Địa chỉ:</span>
                        <span className="value">{selectedRequest.charity_address || '-'}</span>
                      </div>
                      <div className="request-detail-item">
                        <span className="label">Ngày tạo:</span>
                        <span className="value">{selectedRequest.created_at}</span>
                      </div>
                      <div className="request-detail-item">
                        <span className="label">Trạng thái:</span>
                        <span className={`badge ${getBadgeClass(selectedRequest.status)}`}>
                          {getStatusLabel(selectedRequest.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="request-detail-section">
                    <h4>Danh Sách Sản Phẩm ({selectedRequest.total_items})</h4>
                    <table className="request-items-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Tên sản phẩm</th>
                          <th>Mã lô</th>
                          <th>Cửa hàng</th>
                          <th>HSD</th>
                          <th>Số lượng</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.items?.map((item, idx) => (
                          <tr key={item.id}>
                            <td>{idx + 1}</td>
                            <td>{item.product_name || '-'}</td>
                            <td>{item.lot_code || '-'}</td>
                            <td>{item.store_name || '-'}</td>
                            <td>{item.expiry_date || '-'}</td>
                            <td>{item.quantity}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(item.status)}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  {selectedRequest.status === 'PENDING' && (
                    <div className="request-detail-actions">
                      <button
                        onClick={() => handleApproveRequest(selectedRequest.id)}
                        className="btn-large btn-approve"
                      >
                        Duyệt Tất Cả
                      </button>
                      <button
                        onClick={() => handleRejectRequest(selectedRequest.id)}
                        className="btn-large btn-reject"
                      >
                        Từ Chối Tất Cả
                      </button>
                      <button
                        onClick={closeRequestDetail}
                        className="btn-large btn-close"
                      >
                        Đóng
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="donation-empty">Không có dữ liệu</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL - BULK SELECT */}
      {showCreateModal && (
        <div className="donation-modal-overlay" onClick={closeCreateModal}>
          <div className="donation-modal donation-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="donation-modal-header">
              <h3>Tạo Đề Nghị Quyên Góp</h3>
              <button className="donation-modal-close" onClick={closeCreateModal}>✕</button>
            </div>
            <form className="donation-modal-body" onSubmit={submitCreateOffer}>
              {/* Product Selection Table */}
              <div className="donation-selection-section">
                <div className="donation-selection-header">
                  <h4>Chọn Sản Phẩm Từ Kho Hàng</h4>
                  <span className="donation-selection-hint">
                    Chọn sản phẩm và nhập số lượng muốn quyên góp
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
      {/* TOAST NOTIFICATION */}
      {(success || error) && (
        <div className={`donation-toast ${success ? 'success' : 'error'}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {success ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              )}
            </span>
            <p className="toast-message">{success || error}</p>
          </div>
          <button className="toast-close" onClick={() => { setSuccess(''); setError(''); }}>×</button>
        </div>
      )}
    </div>
    </StaffLayout>
  )
}
