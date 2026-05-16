import { useEffect, useMemo, useState } from 'react'
import {
  fetchSupermarketProfile,
  updateSupermarketInfo,
  updateSupermarketAdminUser,
  changeSupermarketAdminPassword
} from '../../services/supermarketAdminApi'
import { useAuth } from '../../services/AuthContext'
import './SupermarketAdminSettings.css'

const ADMIN_PROFILE_STORAGE_KEY = 'supermarket_admin_profile'
const AUTH_STORAGE_KEY = 'seims_auth_user'

function Toast({ message, visible, onClose }) {
  if (!visible) return null;

  const isError = message.includes('Lỗi') || message.includes('thất bại') || message.includes('không khớp') || message.includes('Không tìm thấy');

  return (
    <div className={`sasettings-toast ${isError ? 'error' : 'success'}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {!isError ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </span>
        <p className="toast-message">{message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

const DEFAULT_ADMIN_PROFILE = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  supermarket: 'N/A',
  supermarketAddress: '',
}

export default function SupermarketAdminSettings() {
  const { user } = useAuth()
  const [formData, setFormData] = useState(DEFAULT_ADMIN_PROFILE)
  const [initialFormData, setInitialFormData] = useState(DEFAULT_ADMIN_PROFILE)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const showToast = (msg) => {
    setToast({ visible: true, message: msg })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500)
  }

  useEffect(() => {
    let active = true

    async function loadProfileFromDb() {
      if (!user?.id) {
        if (active) setLoadingProfile(false)
        return
      }

      const profile = {
        username: user.username || '',
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        supermarket: '',
        supermarketAddress: '',
      }

      try {
        const smData = await fetchSupermarketProfile()
        profile.supermarket = smData.name || 'N/A'
        profile.supermarketAddress = smData.address || ''
      } catch (err) {
        console.error('fetchSupermarketProfile failed:', err)
        profile.supermarket = 'N/A'
      }

      if (active) {
        setFormData(profile)
        setInitialFormData(profile)
        localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
        window.dispatchEvent(new Event('supermarket-admin-profile-updated'))
      }
    }

    loadProfileFromDb()
    return () => { active = false }
  }, [user])

  const isDirty = useMemo(() => {
    return JSON.stringify(initialFormData) !== JSON.stringify(formData)
  }, [formData, initialFormData])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!user?.id) {
      showToast('Không tìm thấy thông tin tài khoản.')
      return
    }

    const nextProfile = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
    }

    if (!nextProfile.fullName) {
      showToast('Họ tên không được để trống.', 'error')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10}$/

    if (!nextProfile.email) {
      showToast('Email không được để trống.', 'error')
      return
    }

    if (!emailRegex.test(nextProfile.email)) {
      showToast('Email không đúng định dạng.', 'error')
      return
    }

    if (!nextProfile.phone) {
      showToast('Số điện thoại không được để trống.', 'error')
      return
    }

    if (!phoneRegex.test(nextProfile.phone)) {
      showToast('Số điện thoại phải có đúng 10 chữ số.', 'error')
      return
    }

    try {
      await Promise.all([
        updateSupermarketAdminUser(user.id, {
          fullName: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
          username: nextProfile.username,
        }),
        updateSupermarketInfo({
          name: nextProfile.supermarket,
          address: nextProfile.supermarketAddress
        }),
      ])

      localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...user,
          full_name: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
        }),
      )

      setFormData(nextProfile)
      setInitialFormData(nextProfile)
      window.dispatchEvent(new Event('supermarket-admin-profile-updated'))
      showToast('Đã lưu thay đổi thành công.')
    } catch (err) {
      const errorMsg = err?.response?.data?.detail;
      showToast(typeof errorMsg === 'string' ? errorMsg : (typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : 'Lưu thay đổi thất bại.'));
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

    if (passwordData.newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp.')
      return
    }

    if (!user?.id) {
      showToast('Không tìm thấy thông tin tài khoản.')
      return
    }

    try {
      await changeSupermarketAdminPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      showToast('Đổi mật khẩu thành công.')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Đổi mật khẩu thất bại.')
    }
  }

  return (
    <div className="sasettings-page">
      <form className="sasettings-card" onSubmit={handleSave}>
        <h3 className="sasettings-section-title">Thông Tin Tài Khoản</h3>
        <div className="sasettings-grid">
          <label className="sasettings-field">
            <span>Tên Đăng Nhập</span>
            <input type="text" name="username" value={formData.username} readOnly disabled />
          </label>

          <label className="sasettings-field">
            <span>Họ Và Tên</span>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </label>

          <label className="sasettings-field">
            <span>Tên Siêu Thị</span>
            <input type="text" name="supermarket" value={formData.supermarket} onChange={handleChange} disabled={loadingProfile} />
          </label>

          <label className="sasettings-field">
            <span>Email</span>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </label>

          <label className="sasettings-field">
            <span>Số Điện Thoại</span>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
          </label>

          <label className="sasettings-field">
            <span>Địa Chỉ Siêu Thị</span>
            <input type="text" name="supermarketAddress" value={formData.supermarketAddress} onChange={handleChange} disabled={loadingProfile} placeholder="Địa chỉ siêu thị" />
          </label>
        </div>

        <div className="sasettings-actions">
          <button type="submit" className="sasettings-btn" disabled={!isDirty}>Lưu Thay Đổi</button>
        </div>
      </form>

      <form className="sasettings-card" onSubmit={handleChangePassword}>
        <h3 className="sasettings-section-title">Đổi Mật Khẩu</h3>
        <div className="sasettings-grid sasettings-grid-single">
          <label className="sasettings-field">
            <span>Mật Khẩu Hiện Tại</span>
            <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} placeholder="Nhập mật khẩu hiện tại" required />
          </label>

          <label className="sasettings-field">
            <span>Mật Khẩu Mới</span>
            <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Tối thiểu 6 ký tự" required />
          </label>

          <label className="sasettings-field">
            <span>Xác Nhận Mật Khẩu Mới</span>
            <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Nhập lại mật khẩu mới" required />
          </label>
        </div>

        <div className="sasettings-actions">
          <button type="submit" className="sasettings-btn">Cập Nhật Mật Khẩu</button>
        </div>
      </form>
      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
    </div>
  )
}
