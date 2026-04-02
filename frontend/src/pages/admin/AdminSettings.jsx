import { useEffect, useMemo, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { useAuth } from '../../services/AuthContext'
import { changeAdminUserPassword, updateAdminUser } from '../../services/adminApi'
import './AdminSettings.css'

const ADMIN_PROFILE_STORAGE_KEY = 'seims_admin_profile'
const AUTH_STORAGE_KEY = 'seims_auth_user'

const DEFAULT_ADMIN_PROFILE = {
  username: 'admin',
  fullName: 'Admin',
  email: 'admin@seims.vn',
  phone: '0900000000',
  position: 'System Admin',
}

export default function AdminSettings() {
  const { user } = useAuth()
  const [formData, setFormData] = useState(DEFAULT_ADMIN_PROFILE)
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const profile = {
      username: user?.username || DEFAULT_ADMIN_PROFILE.username,
      fullName: user?.full_name || DEFAULT_ADMIN_PROFILE.fullName,
      email: user?.email || DEFAULT_ADMIN_PROFILE.email,
      phone: user?.phone || DEFAULT_ADMIN_PROFILE.phone,
      position: 'System Admin',
    }
    setFormData(profile)
    localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    window.dispatchEvent(new Event('seims-admin-profile-updated'))
  }, [user])

  const isDirty = useMemo(() => {
    const current = {
      username: user?.username || DEFAULT_ADMIN_PROFILE.username,
      fullName: user?.full_name || DEFAULT_ADMIN_PROFILE.fullName,
      email: user?.email || DEFAULT_ADMIN_PROFILE.email,
      phone: user?.phone || DEFAULT_ADMIN_PROFILE.phone,
      position: 'System Admin',
    }
    return JSON.stringify(current) !== JSON.stringify(formData)
  }, [formData, user])

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'position') return

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaveMessage('')

    if (!user?.id) {
      setSaveMessage('Không tìm thấy thông tin tài khoản hiện tại.')
      return
    }

    try {
      await updateAdminUser(user.id, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      })

      const nextFormData = {
        ...formData,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      }
      setFormData(nextFormData)
      localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(nextFormData))
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...user,
          full_name: nextFormData.fullName,
          email: nextFormData.email,
          phone: nextFormData.phone,
        }),
      )
      window.dispatchEvent(new Event('seims-admin-profile-updated'))
      setSaveMessage('Đã lưu thay đổi thành công.')
    } catch (err) {
      setSaveMessage(err?.response?.data?.detail || 'Lưu thay đổi thất bại.')
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleChangePassword(event) {
    event.preventDefault()
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


    if (!user?.id) {
      setPasswordError('Không tìm thấy thông tin tài khoản hiện tại.')
      return
    }

    try {
      await changeAdminUserPassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage('Đổi mật khẩu thành công.')
    } catch (err) {
      setPasswordError(err?.response?.data?.detail || 'Đổi mật khẩu thất bại.')
    }
  }

  return (
    <SystemAdminLayout>
      <div className="settings-page">
        <form className="settings-card" onSubmit={handleSave}>
          <h3 className="settings-section-title">Thông Tin Tài Khoản</h3>
          <div className="settings-grid">
            <label className="settings-field">
              <span>Tên đăng nhập</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                placeholder="vd: admin_seims"
                readOnly
                disabled
                title="Tên đăng nhập không thể thay đổi"
              />
            </label>

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
