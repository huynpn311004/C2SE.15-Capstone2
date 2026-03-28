import { useEffect, useMemo, useState } from 'react'
import './CustomerProfile.css'

const CUSTOMER_PROFILE_KEY = 'seims_customer_profile'
const AUTH_STORAGE_KEY = 'seims_auth_user'

const defaultProfile = {
  username: '',
  fullName: 'Khách hàng',
  email: 'customer@seims.vn',
  phone: '0901 234 567',
  address: '123 Đường ABC, Quận 1, TP.HCM',
}

export default function CustomerProfile() {
  const usernamePattern = /^[a-zA-Z0-9._-]{3,100}$/
  const [formData, setFormData] = useState(defaultProfile)
  const [initialFormData, setInitialFormData] = useState(defaultProfile)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOMER_PROFILE_KEY)
      const authRaw = localStorage.getItem(AUTH_STORAGE_KEY)
      const authUser = authRaw ? JSON.parse(authRaw) : null

      const fromAuth = {
        username: authUser?.username || '',
        fullName: authUser?.full_name || authUser?.fullName || defaultProfile.fullName,
        email: authUser?.email || defaultProfile.email,
        phone: authUser?.phone || defaultProfile.phone,
      }

      if (stored) {
        const parsed = JSON.parse(stored)
        const nextProfile = { ...defaultProfile, ...fromAuth, ...parsed }
        setFormData(nextProfile)
        setInitialFormData(nextProfile)
      } else {
        const nextProfile = { ...defaultProfile, ...fromAuth }
        setFormData(nextProfile)
        setInitialFormData(nextProfile)
      }
    } catch {
      setFormData(defaultProfile)
      setInitialFormData(defaultProfile)
    }
  }, [])

  const isDirty = useMemo(() => {
    return JSON.stringify(initialFormData) !== JSON.stringify(formData)
  }, [formData, initialFormData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e) => {
    e.preventDefault()

    setSaveMessage('')
    setSaveError('')

    const normalizedUsername = (formData.username || '').trim()
    if (!usernamePattern.test(normalizedUsername)) {
      setSaveError('Tên đăng nhập phải từ 3-100 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang.')
      return
    }

    const nextProfile = {
      ...formData,
      username: normalizedUsername,
    }

    try {
      const authRaw = localStorage.getItem(AUTH_STORAGE_KEY)
      const authUser = authRaw ? JSON.parse(authRaw) : null
      if (authUser) {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            ...authUser,
            username: nextProfile.username,
            full_name: nextProfile.fullName,
            email: nextProfile.email,
            phone: nextProfile.phone,
          }),
        )
      }
    } catch {
      // Ignore auth storage parse errors and still keep customer profile data.
    }

    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(nextProfile))
    setFormData(nextProfile)
    setInitialFormData(nextProfile)
    window.dispatchEvent(new Event('seims-customer-profile-updated'))
    setSaveMessage('Đã lưu thay đổi thành công.')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleChangePassword = (event) => {
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

    if (!passwordData.currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.')
      return
    }

    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordMessage('Đổi mật khẩu thành công.')
  }

  return (
    <div className="csettings-page">
      <form className="csettings-card" onSubmit={handleSave}>
        <h3 className="csettings-section-title">Thông Tin Tài Khoản</h3>

        <div className="csettings-grid">
          <label className="csettings-field">
            <span>Tên Đăng Nhập</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="customer_01"
              required
            />
          </label>

          <label className="csettings-field">
            <span>Họ Và Tên</span>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              required
            />
          </label>

          <label className="csettings-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="customer@seims.vn"
              required
            />
          </label>

          <label className="csettings-field">
            <span>Số Điện Thoại</span>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0901 234 567"
            />
          </label>

          <label className="csettings-field csettings-field-full">
            <span>Địa Chỉ Mặc Định</span>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
            />
          </label>
        </div>

        <div className="csettings-actions">
          <button type="submit" className="csettings-btn" disabled={!isDirty}>
            Lưu Thay Đổi
          </button>
        </div>

        {saveError ? <p className="csettings-msg-error">{saveError}</p> : null}
        {saveMessage ? <p className="csettings-msg-success">{saveMessage}</p> : null}
      </form>

      <form className="csettings-card" onSubmit={handleChangePassword}>
        <h3 className="csettings-section-title">Đổi Mật Khẩu</h3>

        <div className="csettings-grid csettings-grid-single">
          <label className="csettings-field">
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

          <label className="csettings-field">
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

          <label className="csettings-field">
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

        <div className="csettings-actions">
          <button type="submit" className="csettings-btn">
            Cập Nhật Mật Khẩu
          </button>
        </div>

        {passwordError ? <p className="csettings-msg-error">{passwordError}</p> : null}
        {passwordMessage ? <p className="csettings-msg-success">{passwordMessage}</p> : null}
      </form>
    </div>
  )
}
