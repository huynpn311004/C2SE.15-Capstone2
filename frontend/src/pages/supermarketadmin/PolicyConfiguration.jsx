import { useEffect, useMemo, useState } from 'react'
import { fetchSupermarketAuditLogs } from '../../services/supermarketAdminApi'
import './PolicyConfiguration.css'

export default function PolicyConfiguration() {
  const [policies, setPolicies] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', value: '', description: '' })

  useEffect(() => {
    let active = true

    async function loadPolicyLogs() {
      try {
        const logs = await fetchSupermarketAuditLogs(200)
        if (!active) return

        const policyLogs = logs
          .filter((item) => /policy|discount|price|nguong/i.test(item.action || ''))
          .slice(0, 10)
          .map((item) => ({
            id: item.id,
            type: /discount|price/i.test(item.action || '') ? 'discount' : 'threshold',
            name: item.action || 'Policy update',
            value: 0,
            unit: '-',
            description: item.newValue || item.oldValue || 'Không có chi tiết.',
            time: item.time,
            actor: item.actor,
          }))

        setPolicies(policyLogs)
      } catch {
        if (!active) return
        setPolicies([])
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPolicyLogs()
    return () => {
      active = false
    }
  }, [])

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
    setPolicies(prev => prev.map(p => p.id === selected.id ? { ...p, value: val, description: form.description } : p))
    setSuccess('Đã cập nhật hiển thị tại frontend. Backend policy endpoint chưa được cung cấp.')
  }

  const thresholds = useMemo(() => policies.filter(p => p.type === 'threshold'), [policies])
  const discounts = useMemo(() => policies.filter(p => p.type === 'discount'), [policies])

  return (
    <div className="sapolicy-page">
      {/* TOOLBAR */}
      <div className="sapolicy-toolbar">
        <div className="sapolicy-toolbar-info">{loading ? 'Đang tải...' : 'Cấu hình chính sách cho chuỗi siêu thị'}</div>
      </div>

      {/* THRESHOLD CARD */}
      <div className="sapolicy-card">
        <h3 className="sapolicy-card-title">Cấu Hình Ngưỡng</h3>
        <div className="sapolicy-list">
          {!loading && thresholds.length === 0 && <div>Chưa có dữ liệu policy từ backend.</div>}
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
          {!loading && discounts.length === 0 && <div>Chưa có dữ liệu discount policy từ backend.</div>}
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
          {policies.slice(0, 5).map((item) => (
            <div key={item.id} className="sapolicy-log-item">
              <span className="sapolicy-log-time">{item.time || '-'}</span>
              <span className="sapolicy-log-staff">{item.actor || 'System'}</span>
              <span className="sapolicy-log-action">{item.description || '-'}</span>
            </div>
          ))}
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
