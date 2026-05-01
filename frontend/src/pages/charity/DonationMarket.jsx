import { useState, useEffect } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import { fetchCharityDonationOffers, createDonationRequest } from '../../services/charityApi'
import './DonationMarket.css'

const statusBadge = {
  available: 'badge-success',
  pending_full: 'badge-warning',
  out_of_stock: 'badge-danger',
}

const statusLabel = {
  available: 'Còn Hàng',
  pending_full: 'Đã Gửi Yêu Cầu',
  out_of_stock: 'Hết Hàng',
}

export default function DonationMarket() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItems, setSelectedItems] = useState({}) // { offerId: qty }
  const [showModal, setShowModal] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadOffers()
  }, [])

  async function loadOffers() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCharityDonationOffers()
      setOffers(data || [])
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        const messages = detail.map(e => e.msg).join(', ')
        setError(messages || 'Không thể tải danh sách donation')
      } else {
        setError(detail || err.message || 'Không thể tải danh sách donation')
      }
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter)

  const selectedCount = Object.keys(selectedItems).length

  function toggleItem(offerId) {
    setSelectedItems(prev => {
      if (prev[offerId]) {
        const next = { ...prev }
        delete next[offerId]
        return next
      }
      return { ...prev, [offerId]: 1 }
    })
  }

  function updateQty(offerId, qty) {
    const offer = offers.find(o => o.id === offerId)
    const maxQty = offer?.qty || 1
    const newQty = Math.max(1, Math.min(qty, maxQty))
    setSelectedItems(prev => ({ ...prev, [offerId]: newQty }))
  }

  function openCart() {
    setShowModal(true)
    setSubmitError('')
    setSubmitSuccess('')
  }

  function closeModal() {
    setShowModal(false)
  }

  function clearSelection() {
    setSelectedItems({})
    setShowModal(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    const items = Object.entries(selectedItems).map(([offerId, qty]) => ({
      offer_id: parseInt(offerId),
      quantity: qty
    }))

    if (items.length === 0) {
      setSubmitError('Vui lòng chọn ít nhất 1 sản phẩm.')
      return
    }

    setSubmitting(true)
    try {
      await createDonationRequest({ items })
      const count = items.length
      setSubmitSuccess(`Đã gửi yêu cầu nhận ${count} sản phẩm thành công!`)
      setSelectedItems({})
      await loadOffers()
      setTimeout(() => closeModal(), 1500)
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        const messages = detail.map(e => e.msg).join(', ')
        setSubmitError(messages || 'Gửi yêu cầu thất bại')
      } else {
        setSubmitError(detail || err.message || 'Gửi yêu cầu thất bại')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CharityLayout>
      <div className="chmarket-page">
        {/* TOOLBAR */}
        <div className="chmarket-toolbar">
          <div className="chmarket-filter-group">
            <label>Lọc:</label>
            <select className="chmarket-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất Cả</option>
              <option value="available">Còn Hàng</option>
              <option value="pending_full">Đã Gửi Yêu Cầu</option>
              <option value="out_of_stock">Hết Hàng</option>
            </select>
          </div>
          <div className="chmarket-toolbar-right">
            <div className="chmarket-toolbar-info">Hiển thị {filtered.length} donation offer</div>
            {selectedCount > 0 && (
              <button className="chmarket-btn-cart" onClick={openCart}>
                Xem đơn ({selectedCount})
              </button>
            )}
          </div>
        </div>

        {/* LOADING / ERROR */}
        {loading && (
          <div className="chmarket-loading">
            <div className="spinner"></div>
            <span>Đang tải dữ liệu...</span>
          </div>
        )}

        {!loading && error && (
          <div className="chmarket-error-banner">
            <p>{error}</p>
            <button onClick={loadOffers} className="chmarket-retry-btn">Thử lại</button>
          </div>
        )}

        {/* OFFER GRID */}
        {!loading && !error && (
          <div className="chmarket-grid">
            {filtered.length === 0 ? (
              <div className="chmarket-empty">Không có donation nào.</div>
            ) : (
              filtered.map(offer => {
                const isSelected = !!selectedItems[offer.id]
                const isDisabled = offer.qty === 0 || offer.myRequestStatus === 'pending' || offer.myRequestStatus === 'approved'
                return (
                  <div
                    key={offer.id}
                    className={`chmarket-card ${offer.qty === 0 ? 'chmarket-card-disabled' : ''} ${isSelected ? 'chmarket-card-selected' : ''}`}
                  >
                    <div className="chmarket-card-header">
                      <span className={`badge ${statusBadge[offer.status]}`}>
                        {statusLabel[offer.status]}
                      </span>
                    </div>
                    <h3 className="chmarket-card-name">{offer.name}</h3>
                    <p className="chmarket-card-detail">Kho: <strong>{offer.qty}</strong> | HSD: {offer.exp}</p>
                    <p className="chmarket-card-store">{offer.store}</p>
                    {offer.supermarket && offer.supermarket !== offer.store && (
                      <p className="chmarket-card-store chmarket-card-super">{offer.supermarket}</p>
                    )}
                    <div className="chmarket-card-actions">
                      <label className={`chmarket-checkbox-label ${isDisabled ? 'chmarket-checkbox-disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleItem(offer.id)}
                        />
                        Chọn
                      </label>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* CART / REQUEST MODAL */}
        {showModal && (
          <div className="chmarket-modal-overlay" onClick={closeModal}>
            <div className="chmarket-modal chmarket-modal-cart" onClick={e => e.stopPropagation()}>
              <div className="chmarket-modal-header">
                <h3>Đơn Yêu Cầu Nhận Hàng</h3>
                <button className="chmarket-modal-close" onClick={closeModal}>X</button>
              </div>
              <form className="chmarket-modal-body" onSubmit={handleSubmit}>
                <div className="chmarket-cart-items">
                  {Object.entries(selectedItems).map(([offerId, qty]) => {
                    const offer = offers.find(o => o.id === parseInt(offerId))
                    if (!offer) return null
                    return (
                      <div key={offerId} className="chmarket-cart-item">
                        <div className="chmarket-cart-item-info">
                          <strong>{offer.name}</strong>
                          <span>{offer.store} | Kho: {offer.qty}</span>
                        </div>
                        <div className="chmarket-cart-item-right">
                          <div className="chmarket-qty-control">
                            <button
                              type="button"
                              onClick={() => updateQty(parseInt(offerId), qty - 1)}
                              disabled={qty <= 1}
                            >-</button>
                            <input
                              type="number"
                              min="1"
                              max={offer.qty}
                              value={qty}
                              onChange={e => updateQty(parseInt(offerId), parseInt(e.target.value) || 1)}
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(parseInt(offerId), qty + 1)}
                              disabled={qty >= offer.qty}
                            >+</button>
                          </div>
                          <button
                            type="button"
                            className="chmarket-cart-remove"
                            onClick={() => toggleItem(parseInt(offerId))}
                          >✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {submitError && <p className="chmarket-error">{submitError}</p>}
                {submitSuccess && <p className="chmarket-success">{submitSuccess}</p>}
                <div className="chmarket-form-footer">
                  <div className="chmarket-form-actions">
                    <button type="button" className="btn-large btn-close" onClick={clearSelection} disabled={submitting}>Hủy Đơn</button>
                    <button type="submit" className="btn-large chmarket-btn-submit" disabled={submitting || selectedCount === 0}>
                      {submitting ? 'Đang gửi...' : `Xác Nhận (${selectedCount})`}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CharityLayout>
  )
}
