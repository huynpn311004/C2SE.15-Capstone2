import { useState } from 'react'
import './PolicyConfiguration.css'

const seedPolicies = [
  { id: 1, type: 'threshold', name: 'Ngưỡng Sắp Hết Hạn', value: 7, unit: 'ngày', description: 'Sản phẩm sẽ được cảnh báo khi còn <value> ngày trước hạn.' },
  { id: 2, type: 'threshold', name: 'Ngưỡng Hết Hạn', value: 0, unit: 'ngày', description: 'Sản phẩm được coi là hết hạn khi đã qua <value> ngày kể từ ngày hết hạn.' },
  { id: 3, type: 'discount', name: 'Giảm Giá Sắp Hết Hạn', value: 20, unit: '%', description: 'Áp dụng giảm giá <value>% cho sản phẩm sắp hết hạn (mặc định).' },
  { id: 4, type: 'discount', name: 'Giảm Giá Sắp Hết Hạn (Cấp 2)', value: 35, unit: '%', description: 'Áp dụng giảm giá <value>% khi còn ≤ 3 ngày.' },
  { id: 5, type: 'discount', name: 'Giảm Giá Khẩn Cấp', value: 50, unit: '%', description: 'Áp dụng giảm giá <value>% khi còn ≤ 1 ngày hoặc đã hết hạn.' },
]

export default function PolicyConfiguration() {
  const [policies, setPolicies] = useState(seedPolicies)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', value: '', description: '' })

  function openModal(policy) {
    setSelected(policy)
    setForm({ name: policy.name, value: String(policy.value), description: policy.description })
    setError('')
    setSuccess('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelected(null)
    setError('')
    setSuccess('')
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    const val = Number(form.value)
    if (isNaN(val) || val < 0) { setError('Giá trị phải là số không âm.'); return }
    const updated = form.description.replace(/<value>/g, val)
    setPolicies(prev => prev.map(p => p.id === selected.id ? { ...p, value: val, description: updated } : p))
    setSuccess('Đã cập nhật chính sách.')
  }

  const thresholds = policies.filter(p => p.type === 'threshold')
  const discounts = policies.filter(p => p.type === 'discount')

  return (
    <div className="sapolicy-page">
      {/* TOOLBAR */}
      <div className="sapolicy-toolbar">
        <div className="sapolicy-toolbar-info">Cấu hình chính sách cho chuỗi siêu thị</div>
      </div>

      {/* THRESHOLD CARD */}
      <div className="sapolicy-card">
        <h3 className="sapolicy-card-title">Cấu Hình Ngưỡng</h3>
        <div className="sapolicy-list">
          {thresholds.map(p => (
            <div key={p.id} className="sapolicy-item">
              <div className="sapolicy-item-info">
                <span className="sapolicy-item-name">{p.name}</span>
                <span className="sapolicy-item-desc">{p.description}</span>
              </div>
              <div className="sapolicy-item-value">
                <span className="sapolicy-value-num">{p.value}</span>
                <span className="sapolicy-value-unit">{p.unit}</span>
              </div>
              <button onClick={() => openModal(p)} className="action-btn icon-action-btn btn-edit" title="Chỉnh sửa">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* DISCOUNT CARD */}
      <div className="sapolicy-card">
        <h3 className="sapolicy-card-title">Cấu Hình Discount Policy</h3>
        <div className="sapolicy-list">
          {discounts.map(p => (
            <div key={p.id} className="sapolicy-item">
              <div className="sapolicy-item-info">
                <span className="sapolicy-item-name">{p.name}</span>
                <span className="sapolicy-item-desc">{p.description}</span>
              </div>
              <div className="sapolicy-item-value">
                <span className="sapolicy-value-num">{p.value}</span>
                <span className="sapolicy-value-unit">{p.unit}</span>
              </div>
              <button onClick={() => openModal(p)} className="action-btn icon-action-btn btn-edit" title="Chỉnh sửa">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17.25 8.06-8.06 2.75 2.75L5.75 20H3v-2.75Zm13.71-9.04 1.04-1.04a1 1 0 0 0 0-1.41l-1.55-1.55a1 1 0 0 0-1.41 0l-1.04 1.04 2.96 2.96Z" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* OVERRIDE PRICE CARD */}
      <div className="sapolicy-card sapolicy-card-override">
        <h3 className="sapolicy-card-title">Override Giá (Có Audit Log)</h3>
        <p className="sapolicy-override-note">Nhân viên có thể override giá sản phẩm. Tất cả thao tác override được ghi log để kiểm toán.</p>
        <div className="sapolicy-override-log">
          <div className="sapolicy-log-item">
            <span className="sapolicy-log-time">25/03/2026 14:32</span>
            <span className="sapolicy-log-staff">Nguyễn Văn A — BigMart Q1</span>
            <span className="sapolicy-log-action">Sữa Tươi 1L: <span className="sapolicy-override-old">35,000</span> → <span className="sapolicy-override-new">28,000</span></span>
          </div>
          <div className="sapolicy-log-item">
            <span className="sapolicy-log-time">24/03/2026 09:15</span>
            <span className="sapolicy-log-staff">Trần Thị B — BigMart Q1</span>
            <span className="sapolicy-log-action">Bánh Mì: <span className="sapolicy-override-old">22,000</span> → <span className="sapolicy-override-new">15,000</span></span>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {showModal && selected && (
        <div className="sapolicy-modal-overlay" onClick={closeModal}>
          <div className="sapolicy-modal" onClick={e => e.stopPropagation()}>
            <div className="sapolicy-modal-header">
              <h3>Chỉnh Sửa Chính Sách</h3>
              <button className="sapolicy-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="sapolicy-modal-body" onSubmit={handleSubmit}>
              <div className="sapolicy-form-grid">
                <div className="sapolicy-form-column">
                  <div className="sapolicy-form-field">
                    <label>Tên Chính Sách</label>
                    <input name="name" value={form.name} onChange={handleChange} className="sapolicy-input" placeholder="Tên chính sách" required />
                  </div>
                  <div className="sapolicy-form-field">
                    <label>Giá Trị</label>
                    <input name="value" type="number" value={form.value} onChange={handleChange} className="sapolicy-input" placeholder="Giá trị số" min="0" required />
                  </div>
                </div>
                <div className="sapolicy-form-column">
                  <div className="sapolicy-form-field">
                    <label>Mô Tả</label>
                    <textarea name="description" value={form.description} onChange={handleChange} className="sapolicy-input sapolicy-textarea" placeholder="Mô tả chính sách" rows={3} />
                  </div>
                </div>
              </div>
              {error && <p className="sapolicy-error">{error}</p>}
              {success && <p className="sapolicy-success">{success}</p>}
              <div className="sapolicy-form-footer">
                <div className="sapolicy-form-actions">
                  <button type="submit" className="btn-large sapolicy-btn-save">Lưu Thay Đổi</button>
                  <button type="button" className="btn-large btn-close" onClick={closeModal}>Hủy</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
