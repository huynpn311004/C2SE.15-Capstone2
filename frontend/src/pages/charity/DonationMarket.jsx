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
  const [selected, setSelected] = useState(null)
  const [requestQty, setRequestQty] = useState(1)
  const [note, setNote] = useState('')
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
      setError(err?.response?.data?.detail || err.message || 'Không thể tải danh sách donation')
      setOffers([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter)

  function openRequest(offer) {
    setSelected(offer)
    setRequestQty(1)
    setNote('')
    setSubmitError('')
    setSubmitSuccess('')
  }

  function closeModal() {
    setSelected(null)
    setSubmitError('')
    setSubmitSuccess('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!selected) return

    if (requestQty < 1 || requestQty > selected.qty) {
      setSubmitError(`Số lượng phải từ 1 đến ${selected.qty}.`)
      return
    }

    setSubmitting(true)
    try {
      await createDonationRequest({
        offerId: selected.id,
        requestQty: requestQty,
        note: note,
      })
      setSubmitSuccess(`Đã gửi yêu cầu nhận ${requestQty} sản phẩm "${selected.name}" thành công!`)
      await loadOffers()
      setTimeout(() => closeModal(), 1500)
    } catch (err) {
      setSubmitError(err?.response?.data?.detail || err.message || 'Gửi yêu cầu thất bại')
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
          <div className="chmarket-toolbar-info">Hiển thị {filtered.length} donation offer</div>
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
              filtered.map(offer => (
                <div key={offer.id} className={`chmarket-card ${offer.qty === 0 ? 'chmarket-card-disabled' : ''}`}>
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
                  <button
                    onClick={() => openRequest(offer)}
                    disabled={offer.qty === 0 || offer.myRequestStatus === 'pending' || offer.myRequestStatus === 'approved'}
                    className={`chmarket-btn-request ${offer.qty === 0 ? 'chmarket-btn-disabled' : ''} ${offer.myRequestStatus === 'pending' || offer.myRequestStatus === 'approved' ? 'chmarket-btn-pending' : ''}`}
                  >
                    {offer.myRequestStatus === 'pending' || offer.myRequestStatus === 'approved'
                      ? 'Đã gửi yêu cầu'
                      : offer.qty === 0
                        ? 'Hết hàng'
                        : 'Gửi yêu cầu nhận hàng'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* REQUEST MODAL */}
        {selected && (
          <div className="chmarket-modal-overlay" onClick={closeModal}>
            <div className="chmarket-modal" onClick={e => e.stopPropagation()}>
              <div className="chmarket-modal-header">
                <h3>Yêu Cầu Nhận Hàng</h3>
                <button className="chmarket-modal-close" onClick={closeModal}>X</button>
              </div>
              <form className="chmarket-modal-body" onSubmit={handleSubmit}>
                <p className="chmarket-modal-subtitle">
                  Bạn đang yêu cầu nhận hàng từ: <strong>{selected.store}</strong>
                </p>
                <div className="chmarket-modal-product">
                  <strong>{selected.name}</strong>
                  <span>Kho: {selected.qty} | HSD: {selected.exp}</span>
                </div>
                <div className="chmarket-form-field">
                  <label>Số lượng muốn nhận (Tối đa: {selected.qty})</label>
                  <input
                    type="number"
                    min="1"
                    max={selected.qty}
                    value={requestQty}
                    onChange={e => setRequestQty(Number(e.target.value))}
                    className="chmarket-input"
                    required
                  />
                </div>
                <div className="chmarket-form-field">
                  <label>Ghi chú (Không bắt buộc)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="chmarket-input chmarket-textarea"
                    placeholder="Lý do nhận hàng hoặc thời gian lấy hàng..."
                    rows={3}
                  />
                </div>
                {submitError && <p className="chmarket-error">{submitError}</p>}
                {submitSuccess && <p className="chmarket-success">{submitSuccess}</p>}
                <div className="chmarket-form-footer">
                  <div className="chmarket-form-actions">
                    <button type="button" className="btn-large btn-close" onClick={closeModal} disabled={submitting}>Hủy</button>
                    <button type="submit" className="btn-large chmarket-btn-submit" disabled={submitting}>
                      {submitting ? 'Đang gửi...' : 'Xác Nhận'}
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
