import { useMemo, useState } from 'react'
import SystemAdminLayout from '../../components/layout/Layout'
import './AdminSettings.css'

const ADMIN_PROFILE_STORAGE_KEY = 'seims_admin_profile'
const ADMIN_PASSWORD_STORAGE_KEY = 'seims_admin_password'

const DEFAULT_ADMIN_PROFILE = {
  fullName: 'Admin',
  email: 'admin@seims.vn',
  phone: '0900000000',
  position: 'System Admin',
}

const DEFAULT_ADMIN_PASSWORD = 'admin123'

function getInitialProfile() {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_ADMIN_PROFILE
    return {
      ...DEFAULT_ADMIN_PROFILE,
      ...JSON.parse(raw),
    }
  } catch {
    return DEFAULT_ADMIN_PROFILE
  }
}

export default function AdminSettings() {
  const [formData, setFormData] = useState(getInitialProfile)
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const isDirty = useMemo(() => {
    const current = getInitialProfile()
    return JSON.stringify(current) !== JSON.stringify(formData)
  }, [formData])

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'position') return

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleSave(event) {
    event.preventDefault()
    localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(formData))
    window.dispatchEvent(new Event('seims-admin-profile-updated'))
    setSaveMessage('Đã lưu thay đổi thành công.')
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleChangePassword(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    const storedPassword = localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD

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

    localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, passwordData.newPassword)
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordMessage('Đổi mật khẩu thành công.')
  }

  return (
    <SystemAdminLayout>
      <div className="settings-page">
        <form className="settings-card" onSubmit={handleSave}>
          <h3 className="settings-section-title">Thông Tin Tài Khoản</h3>
          <div className="settings-grid">
            <label className="settings-field">
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

            <label className="settings-field">
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

            <label className="settings-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@seims.vn"
                required
              />
            </label>

            <label className="settings-field">
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

          <div className="settings-actions">
            <button type="submit" className="settings-btn" disabled={!isDirty}>
              Lưu Thay Đổi
            </button>
          </div>

          {saveMessage && <p className="settings-msg-success">{saveMessage}</p>}
        </form>

        <form className="settings-card" onSubmit={handleChangePassword}>
          <h3 className="settings-section-title">Đổi Mật Khẩu</h3>
          <div className="settings-grid settings-grid-single">
            <label className="settings-field">
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

            <label className="settings-field">
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

            <label className="settings-field">
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

          <div className="settings-actions">
            <button type="submit" className="settings-btn">
              Cập Nhật Mật Khẩu
            </button>
          </div>

          {passwordError && <p className="settings-msg-error">{passwordError}</p>}
          {passwordMessage && <p className="settings-msg-success">{passwordMessage}</p>}
        </form>
      </div>
    </SystemAdminLayout>
  )
}
