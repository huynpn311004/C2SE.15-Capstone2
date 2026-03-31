import { useState, useEffect } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import {
  fetchCharityProfile,
  updateCharityProfile,
  changeCharityPassword,
} from '../../services/charityApi'
import './CharitySettings.css'

export default function CharitySettings() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    orgName: '',
    email: '',
    phone: '',
  })
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCharityProfile()
      setFormData({
        fullName: data.fullName || '',
        orgName: data.orgName || '',
        email: data.email || '',
        phone: data.phone || '',
      })
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể tải thông tin')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMessage('')
    setSaveError('')
    try {
      await updateCharityProfile(formData)
      setSaveMessage('Đã lưu thay đổi thành công.')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveError(err?.response?.data?.detail || err.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.')
      return
    }

    setChangingPassword(true)
    try {
      await changeCharityPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('Đổi mật khẩu thành công.')
      setTimeout(() => setPasswordMessage(''), 3000)
    } catch (err) {
      setPasswordError(err?.response?.data?.detail || err.message || 'Đổi mật khẩu thất bại')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <CharityLayout>
        <div className="chsettings-loading">
          <div className="spinner"></div>
          <span>Đang tải thông tin...</span>
        </div>
      </CharityLayout>
    )
  }

  if (error) {
    return (
      <CharityLayout>
        <div className="chsettings-error-banner">
          <p>{error}</p>
          <button onClick={loadProfile} className="chsettings-retry-btn">Thử lại</button>
        </div>
      </CharityLayout>
    )
  }

  return (
    <CharityLayout>
      <div className="chsettings-page">
        {/* THONG TIN TAI KHOAN */}
        <form className="chsettings-card" onSubmit={handleSave}>
          <h3 className="chsettings-section-title">Thông Tin Tài Khoản</h3>
          <div className="chsettings-grid">
            <label className="chsettings-field">
              <span>Họ Và Tên</span>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nhập Họ Và Tên"
                required
              />
            </label>

            <label className="chsettings-field">
              <span>Tổ Chức</span>
              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                placeholder="Tên tổ chức từ thiện"
              />
            </label>

            <label className="chsettings-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="charity@abc.vn"
                required
              />
            </label>

            <label className="chsettings-field">
              <span>Số Điện Thoại</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0900000000"
              />
            </label>
          </div>

          <div className="chsettings-actions">
            <button type="submit" className="chsettings-btn" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>

          {saveError && <p className="chsettings-msg-error">{saveError}</p>}
          {saveMessage && <p className="chsettings-msg-success">{saveMessage}</p>}
        </form>

        {/* DOI MAT KHAU */}
        <form className="chsettings-card" onSubmit={handleChangePassword}>
          <h3 className="chsettings-section-title">Đổi Mật Khẩu</h3>
          <div className="chsettings-grid chsettings-grid-single">
            <label className="chsettings-field">
              <span>Mật Khẩu Hiện Tại</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập mật khẩu hiện tại"
                required
              />
            </label>

            <label className="chsettings-field">
              <span>Mật Khẩu Mới</span>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Tối thiểu 6 ký tự"
                required
              />
            </label>

            <label className="chsettings-field">
              <span>Xác Nhận Mật Khẩu Mới</span>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </label>
          </div>

          <div className="chsettings-actions">
            <button type="submit" className="chsettings-btn" disabled={changingPassword}>
              {changingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </div>

          {passwordError && <p className="chsettings-msg-error">{passwordError}</p>}
          {passwordMessage && <p className="chsettings-msg-success">{passwordMessage}</p>}
        </form>
      </div>
    </CharityLayout>
  )
}
