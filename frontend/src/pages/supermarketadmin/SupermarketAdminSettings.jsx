import { useEffect, useMemo, useState } from 'react'
import { changeAdminUserPassword, fetchAdminUsers, updateAdminUser } from '../../services/adminApi'
import { useAuth } from '../../services/AuthContext'
import './SupermarketAdminSettings.css'

const ADMIN_PROFILE_STORAGE_KEY = 'supermarket_admin_profile'
const AUTH_STORAGE_KEY = 'seims_auth_user'

const DEFAULT_ADMIN_PROFILE = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  supermarket: 'N/A',
}

export default function SupermarketAdminSettings() {
  const usernamePattern = /^[a-zA-Z0-9._-]{3,100}$/
  const { user } = useAuth()
  const [formData, setFormData] = useState(DEFAULT_ADMIN_PROFILE)
  const [initialFormData, setInitialFormData] = useState(DEFAULT_ADMIN_PROFILE)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfileFromDb() {
      if (!user?.id) {
        if (active) setLoadingProfile(false)
        return
      }

      try {
        const users = await fetchAdminUsers()
        const current = users.find((item) => item.id === user.id)

        const profile = {
          username: user.username || '',
          fullName: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          supermarket: current?.supermarket || 'N/A',
        }

        if (active) {
          setFormData(profile)
          setInitialFormData(profile)
          localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
          window.dispatchEvent(new Event('supermarket-admin-profile-updated'))
        }
      } catch {
        const fallback = {
          username: user.username || '',
          fullName: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          supermarket: 'N/A',
        }
        if (active) {
          setFormData(fallback)
          setInitialFormData(fallback)
        }
      } finally {
        if (active) setLoadingProfile(false)
      }
    }

    loadProfileFromDb()
    return () => {
      active = false
    }
  }, [user])

  const isDirty = useMemo(() => {
    return JSON.stringify(initialFormData) !== JSON.stringify(formData)
  }, [formData, initialFormData])

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'supermarket') return

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

    const normalizedUsername = (formData.username || '').trim()
    if (!usernamePattern.test(normalizedUsername)) {
      setSaveMessage('Tên đăng nhập phải từ 3-100 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang.')
      return
    }

    const nextProfile = {
      ...formData,
      username: normalizedUsername,
    }

    try {
      await updateAdminUser(user.id, {
        username: normalizedUsername,
        fullName: nextProfile.fullName,
        email: nextProfile.email,
        phone: nextProfile.phone,
      })

      localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...user,
          username: normalizedUsername,
          full_name: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
        }),
      )

      setFormData(nextProfile)
      setInitialFormData(nextProfile)
      window.dispatchEvent(new Event('supermarket-admin-profile-updated'))
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
    <div className="sasettings-page">
      <form className="sasettings-card" onSubmit={handleSave}>
        <h3 className="sasettings-section-title">Thông Tin Tài Khoản</h3>
        <div className="sasettings-grid">
          <label className="sasettings-field">
            <span>Tên Đăng Nhập</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="vd: manager_sm"
              disabled={loadingProfile}
              required
            />
          </label>

          <label className="sasettings-field">
            <span>Họ Và Tên</span>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập Họ Và Tên"
              disabled={loadingProfile}
              required
            />
          </label>

          <label className="sasettings-field">
            <span>Siêu Thị</span>
            <input
              type="text"
              name="supermarket"
              value={formData.supermarket}
              readOnly
              disabled
              aria-label="Siêu thị hiện tại"
            />
          </label>

          <label className="sasettings-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="manager@supermarket.vn"
              disabled={loadingProfile}
              required
            />
          </label>

          <label className="sasettings-field">
            <span>Số Điện Thoại</span>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0900000000"
              disabled={loadingProfile}
              required
            />
          </label>
        </div>

        <div className="sasettings-actions">
          <button type="submit" className="sasettings-btn" disabled={loadingProfile || !isDirty}>
            Lưu Thay Đổi
          </button>
        </div>

        {saveMessage && <p className="sasettings-msg-success">{saveMessage}</p>}
      </form>

      <form className="sasettings-card" onSubmit={handleChangePassword}>
        <h3 className="sasettings-section-title">Đổi Mật Khẩu</h3>
        <div className="sasettings-grid sasettings-grid-single">
          <label className="sasettings-field">
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

          <label className="sasettings-field">
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

          <label className="sasettings-field">
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

        <div className="sasettings-actions">
          <button type="submit" className="sasettings-btn">
            Cập Nhật Mật Khẩu
          </button>
        </div>

        {passwordError && <p className="sasettings-msg-error">{passwordError}</p>}
        {passwordMessage && <p className="sasettings-msg-success">{passwordMessage}</p>}
      </form>
    </div>
  )
}
