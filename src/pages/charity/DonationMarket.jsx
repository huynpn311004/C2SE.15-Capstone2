import { useState } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import './DonationMarket.css'

const seedOffers = [
  { id: 1, name: 'Sữa Tươi Vinamilk 1L', qty: 20, exp: '10/04/2026', store: 'BigMart Q1', status: 'available' },
  { id: 2, name: 'Mì Tôm Hảo Hảo', qty: 0, exp: '20/06/2026', store: 'Lotte Mart', status: 'out_of_stock' },
  { id: 3, name: 'Nước Cam Tropicana', qty: 10, exp: '15/05/2026', store: 'WinMart', status: 'pending_full' },
  { id: 4, name: 'Bánh Mì Tươi', qty: 15, exp: '26/03/2026', store: 'BigMart Q3', status: 'available' },
  { id: 5, name: 'Phô Mai Con Bò Cười', qty: 5, exp: '05/04/2026', store: 'BigMart Q5', status: 'available' },
]

const statusBadge = {
  available: 'badge-success',
  pending_full: 'badge-warning',
  out_of_stock: 'badge-danger',
}

const statusLabel = {
  available: 'Còn Hàng',
  pending_full: 'Chờ Đủ',
  out_of_stock: 'Hết Hàng',
}

export default function DonationMarket() {
  const [offers] = useState(seedOffers)
  const [selected, setSelected] = useState(null)
  const [requestQty, setRequestQty] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? offers : offers.filter(o => o.status === filter)

  function openRequest(offer) {
    setSelected(offer)
    setRequestQty(1)
    setNote('')
    setError('')
    setSuccess('')
  }

  function closeModal() {
    setSelected(null)
    setError('')
    setSuccess('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (requestQty < 1 || requestQty > selected.qty) {
      setError(`Số lượng phải từ 1 đến ${selected.qty}.`)
      return
    }
    setSuccess(`Đã gửi yêu cầu nhận ${requestQty} sản phẩm "${selected.name}" thành công!`)
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
              <option value="pending_full">Chờ Đủ</option>
              <option value="out_of_stock">Hết Hàng</option>
            </select>
          </div>
          <div className="chmarket-toolbar-info">Hiển thị {filtered.length} donation offer</div>
        </div>

        {/* OFFER GRID */}
        <div className="chmarket-grid">
          {filtered.map(offer => (
            <div key={offer.id} className={`chmarket-card ${offer.qty === 0 ? 'chmarket-card-disabled' : ''}`}>
              <div className="chmarket-card-header">
                <span className={`badge ${statusBadge[offer.status]}`}>
                  {statusLabel[offer.status]}
                </span>
              </div>
              <h3 className="chmarket-card-name">{offer.name}</h3>
              <p className="chmarket-card-detail">Kho: <strong>{offer.qty}</strong> | HSD: {offer.exp}</p>
              <p className="chmarket-card-store">{offer.store}</p>
              <button
                onClick={() => openRequest(offer)}
                disabled={offer.qty === 0}
                className={`chmarket-btn-request ${offer.qty === 0 ? 'chmarket-btn-disabled' : ''}`}
              >
                {offer.qty === 0 ? 'Hết hàng' : 'Gửi yêu cầu nhận hàng'}
              </button>
            </div>
          ))}
        </div>

        {/* REQUEST MODAL */}
        {selected && (
          <div className="chmarket-modal-overlay" onClick={closeModal}>
            <div className="chmarket-modal" onClick={e => e.stopPropagation()}>
              <div className="chmarket-modal-header">
                <h3>Yêu Cầu Nhận Hàng</h3>
                <button className="chmarket-modal-close" onClick={closeModal}>✕</button>
              </div>
              <form className="chmarket-modal-body" onSubmit={handleSubmit}>
                <p className="chmarket-modal-subtitle">
                  Bạn đang yêu cầu nhận hàng từ: <strong>{selected.store}</strong>
                </p>
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
                {error && <p className="chmarket-error">{error}</p>}
                {success && <p className="chmarket-success">{success}</p>}
                <div className="chmarket-form-footer">
                  <div className="chmarket-form-actions">
                    <button type="button" className="btn-large btn-close" onClick={closeModal}>Hủy</button>
                    <button type="submit" className="btn-large chmarket-btn-submit">Xác Nhận</button>
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
