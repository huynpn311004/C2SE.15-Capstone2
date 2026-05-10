import { useEffect, useMemo, useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { useAuth } from '../../services/AuthContext'
import { fetchStaffProfile, updateStaffProfile, changeStaffPassword } from '../../services/staffApi'
import './StaffSetting.css'

export default function StaffSetting() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    store: '',
    storeAddress: '',
    role: 'store_staff',
  })
  const [initialProfile, setInitialProfile] = useState(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
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

  async function loadProfile() {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await fetchStaffProfile()
      const loadedProfile = {
        username: data.username || user.username || '',
        fullName: data.fullName || user.full_name || '',
        email: data.email || user.email || '',
        phone: data.phone || user.phone || '',
        store: data.storeName || data.store || '',
        storeAddress: data.storeAddress || '',
        role: data.role || user.role || 'store_staff',
      }
      setProfile(loadedProfile)
      setInitialProfile(loadedProfile)
    } catch (err) {
      const loadedProfile = {
        username: user.username || '',
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        store: user.storeName || '',
        storeAddress: user.storeAddress || '',
        role: user.role || 'store_staff',
      }
      setProfile(loadedProfile)
      setInitialProfile(loadedProfile)
    } finally {
      setLoading(false)
    }
  }

  const isDirty = useMemo(() => {
    if (!initialProfile) return false
    return JSON.stringify(initialProfile) !== JSON.stringify(profile)
  }, [profile, initialProfile])

  function handleProfileChange(event) {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
    setSuccess('')
    setError('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!profile.fullName.trim()) {
      setError('Họ tên không được để trống.')
      return
    }
    if (!profile.email.trim()) {
      setError('Email không được để trống.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10}$/

    if (!emailRegex.test(profile.email.trim())) {
      setError('Email không đúng định dạng.')
      return
    }

    if (!profile.phone.trim()) {
      setError('Số điện thoại không được để trống.')
      return
    }

    if (!phoneRegex.test(profile.phone.trim())) {
      setError('Số điện thoại phải có đúng 10 chữ số.')
      return
    }

    try {
      setSaving(true)
      await updateStaffProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      })
      setInitialProfile({ ...profile })
      setSuccess('Đã lưu thay đổi thành công.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
    setSuccess('')
    setError('')
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setSuccess('')
    setError('')

    if (!passwordData.currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    try {
      setPasswordSaving(true)
      await changeStaffPassword({
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
      setError(err.response?.data?.detail || err.message || 'Đổi mật khẩu thất bại.')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <StaffLayout>
        <div className="settings-page">
          <div className="settings-card" style={{ textAlign: 'center', padding: '3rem' }}>
            Đang tải...
          </div>
        </div>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout>
      <div className="settings-page">
        {/* Thông Tin Cá Nhân */}
        <form className="settings-card" onSubmit={handleSave}>
          <h3 className="settings-section-title">Thông Tin Cá Nhân</h3>
          <div className="settings-grid">
            <label className="settings-field">
              <span>Tên Đăng Nhập</span>
              <input
                type="text"
                name="username"
                value={profile.username}
                readOnly
                disabled
                placeholder="staff_01"
              />
            </label>

            <label className="settings-field">
              <span>Họ Và Tên</span>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleProfileChange}
                placeholder="Nhập Họ Và Tên"
                required
              />
            </label>

            <label className="settings-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                placeholder="email@example.com"
                required
              />
            </label>

            <label className="settings-field">
              <span>Số Điện Thoại</span>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                placeholder="0900000000"
                required
              />
            </label>

            <label className="settings-field">
              <span>Cửa Hàng</span>
              <input
                type="text"
                name="store"
                value={profile.store}
                readOnly
                disabled
                placeholder="Chưa gán cửa hàng"
              />
            </label>

            <label className="settings-field">
              <span>Địa Chỉ Cửa Hàng</span>
              <input
                type="text"
                name="storeAddress"
                value={profile.storeAddress || ''}
                readOnly
                disabled
                placeholder="Chưa có địa chỉ"
              />
            </label>

            <label className="settings-field">
              <span>Chức Vụ</span>
              <input
                type="text"
                name="role"
                value={profile.role === 'store_staff' ? 'Nhân Viên Cửa Hàng' : profile.role}
                disabled
              />
            </label>
          </div>

          <div className="settings-actions">
            <button type="submit" className="settings-btn" disabled={!isDirty || saving}>
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>


        </form>

        {/* Đổi Mật Khẩu */}
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
            <button type="submit" className="settings-btn" disabled={passwordSaving}>
              {passwordSaving ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
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
    </StaffLayout>
  )
}