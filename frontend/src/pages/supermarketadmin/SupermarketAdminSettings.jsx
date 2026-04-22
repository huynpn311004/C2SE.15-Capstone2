import { useEffect, useMemo, useState } from 'react'
import { changeAdminUserPassword, updateAdminUser } from '../../services/adminApi'
import { fetchSupermarketProfile, updateSupermarketProfile } from '../../services/supermarketAdminApi'
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
  supermarketAddress: '',
}

export default function SupermarketAdminSettings() {
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
    setSaveMessage('')

    if (!user?.id) {
      setSaveMessage('Không tìm thấy thông tin tài khoản.')
      return
    }

    const nextProfile = {
      ...formData,
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
    }

    try {
      await Promise.all([
        updateAdminUser(user.id, {
          fullName: nextProfile.fullName,
          email: nextProfile.email,
          phone: nextProfile.phone,
        }),
        updateSupermarketProfile({ name: nextProfile.supermarket, address: nextProfile.supermarketAddress }),
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
      setPasswordError('Không tìm thấy thông tin tài khoản.')
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
            <input type="text" name="username" value={formData.username} readOnly disabled />
          </label>

          <label className="sasettings-field">
            <span>Họ Và Tên</span>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} disabled={loadingProfile} required />
          </label>

          <label className="sasettings-field">
            <span>Tên Siêu Thị</span>
            <input type="text" name="supermarket" value={formData.supermarket} onChange={handleChange} disabled={loadingProfile} />
          </label>

          <label className="sasettings-field">
            <span>Email</span>
            <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={loadingProfile} required />
          </label>

          <label className="sasettings-field">
            <span>Số Điện Thoại</span>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} disabled={loadingProfile} required />
          </label>

          <label className="sasettings-field">
            <span>Địa Chỉ Siêu Thị</span>
            <input type="text" name="supermarketAddress" value={formData.supermarketAddress} onChange={handleChange} disabled={loadingProfile} placeholder="Địa chỉ siêu thị" />
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

        {passwordError && <p className="sasettings-msg-error">{passwordError}</p>}
        {passwordMessage && <p className="sasettings-msg-success">{passwordMessage}</p>}
      </form>
    </div>
  )
}
