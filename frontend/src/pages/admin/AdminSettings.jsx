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

function createProfileFromUser(userData) {
  return {
    username: userData?.username || DEFAULT_ADMIN_PROFILE.username,
    fullName: userData?.full_name || DEFAULT_ADMIN_PROFILE.fullName,
    email: userData?.email || DEFAULT_ADMIN_PROFILE.email,
    phone: userData?.phone || DEFAULT_ADMIN_PROFILE.phone,
    position: 'System Admin',
  }
}

export default function AdminSettings() {
  const { user } = useAuth()
  const [formData, setFormData] = useState(() => createProfileFromUser(user))
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const profile = createProfileFromUser(user)
    setFormData(profile)
    localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    window.dispatchEvent(new Event('seims-admin-profile-updated'))
  }, [user])

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const isDirty = useMemo(() => {
    const current = createProfileFromUser(user)
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
    setSuccess('')
    setError('')

    if (!user?.id) {
      setError('Không tìm thấy thông tin tài khoản hiện tại.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10}$/

    if (!formData.email.trim()) {
      setError('Email không được để trống.')
      return
    }

    if (!emailRegex.test(formData.email.trim())) {
      setError('Email không đúng định dạng.')
      return
    }

    if (!formData.phone.trim()) {
      setError('Số điện thoại không được để trống.')
      return
    }

    if (!phoneRegex.test(formData.phone.trim())) {
      setError('Số điện thoại phải có đúng 10 chữ số.')
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
      setSuccess('Đã lưu thay đổi thành công.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Lưu thay đổi thất bại.')
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
    setSuccess('')
    setError('')

    if (passwordData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }


    if (!user?.id) {
      setError('Không tìm thấy thông tin tài khoản hiện tại.')
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
      setSuccess('Đổi mật khẩu thành công.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Đổi mật khẩu thất bại.')
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
                readOnly
                disabled
              />
            </label>

            <label className="settings-field">
              <span>Họ Và Tên</span>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
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
              />
            </label>

            <label className="settings-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                required
              />
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="settings-btn" disabled={!isDirty}>
              Lưu Thay Đổi
            </button>
          </div>
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
        </form>

        {/* TOAST NOTIFICATION */}
        {(success || error) && (
          <div className={`settings-toast ${success ? 'success' : 'error'}`}>
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
    </SystemAdminLayout>
  )
}
