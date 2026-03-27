import { useState } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import './CharitySettings.css'

const CHARITY_PROFILE_KEY = 'seims_charity_profile'
const CHARITY_PASSWORD_KEY = 'seims_charity_password'
const DEFAULT_PASSWORD = 'charity123'

const DEFAULT_PROFILE = {
  fullName: 'Tổ chức từ thiện ABC',
  email: 'charity@abc.vn',
  phone: '0900000000',
  position: 'Charity Organization',
}

function getStoredProfile() {
  try {
    const raw = localStorage.getItem(CHARITY_PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROFILE
  }
}

export default function CharitySettings() {
  const [formData, setFormData] = useState(getStoredProfile)
  const [saveMessage, setSaveMessage] = useState('')

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'position') return
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    localStorage.setItem(CHARITY_PROFILE_KEY, JSON.stringify(formData))
    window.dispatchEvent(new Event('seims-charity-profile-updated'))
    setSaveMessage('Đã lưu thay đổi thành công.')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    const storedPassword = localStorage.getItem(CHARITY_PASSWORD_KEY) || DEFAULT_PASSWORD

    if (passwordData.currentPassword !== storedPassword) {
      setPasswordError('Mật khẩu hiện tại không đúng.')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.')
      return
    }

    localStorage.setItem(CHARITY_PASSWORD_KEY, passwordData.newPassword)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordMessage('Đổi mật khẩu thành công.')
    setTimeout(() => setPasswordMessage(''), 3000)
  }

  return (
    <CharityLayout>
      <div className="chsettings-page">
        {/* THÔNG TIN TÀI KHOẢN */}
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
              <span>Chức Vụ</span>
              <input
                type="text"
                name="position"
                value={formData.position}
                readOnly
                disabled
                aria-label="Chức vụ hiện tại"
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
                required
              />
            </label>
          </div>

          <div className="chsettings-actions">
            <button type="submit" className="chsettings-btn">Lưu Thay Đổi</button>
          </div>

          {saveMessage && <p className="chsettings-msg-success">{saveMessage}</p>}
        </form>

        {/* ĐỔI MẬT KHẨU */}
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
            <button type="submit" className="chsettings-btn">Cập Nhật Mật Khẩu</button>
          </div>

          {passwordError && <p className="chsettings-msg-error">{passwordError}</p>}
          {passwordMessage && <p className="chsettings-msg-success">{passwordMessage}</p>}
        </form>
      </div>
    </CharityLayout>
  )
}
