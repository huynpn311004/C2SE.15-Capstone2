import { useEffect, useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { useAuth } from '../../services/AuthContext'
import { fetchStaffProfile, updateStaffProfile } from '../../services/staffApi'
import './StaffSetting.css'

export default function StaffSetting() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    store: '',
    storeAddress: '',
    role: 'store_staff',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [user])

  async function loadProfile() {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await fetchStaffProfile()
      setProfile({
        fullName: data.fullName || user.full_name || '',
        email: data.email || user.email || '',
        phone: data.phone || user.phone || '',
        store: data.storeName || data.store || '',
        storeAddress: data.storeAddress || '',
        role: data.role || user.role || 'store_staff',
      })
    } catch (err) {
      setProfile({
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        store: user.storeName || '',
        storeAddress: user.storeAddress || '',
        role: user.role || 'store_staff',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
    setSaveMessage('')
    setError('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSaveMessage('')

    if (!profile.fullName.trim()) {
      setError('Họ tên không được để trống.')
      return
    }
    if (!profile.email.trim()) {
      setError('Email không được để trống.')
      return
    }
    if (!profile.phone.trim()) {
      setError('Số điện thoại không được để trống.')
      return
    }

    try {
      setSaving(true)
      await updateStaffProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      })
      setSaveMessage('Đã lưu thay đổi thành công.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Cập nhật thất bại.')
    } finally {
      setSaving(false)
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
    setPasswordMessage('')
    setPasswordError('')
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

    try {
      setPasswordSaving(true)
      await updateStaffProfile({
        changePassword: true,
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
      setPasswordError(err.response?.data?.detail || 'Đổi mật khẩu thất bại.')
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
            <button type="submit" className="settings-btn" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>

          {error && <p className="settings-msg-error">{error}</p>}
          {saveMessage && <p className="settings-msg-success">{saveMessage}</p>}
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

          {passwordError && <p className="settings-msg-error">{passwordError}</p>}
          {passwordMessage && <p className="settings-msg-success">{passwordMessage}</p>}
        </form>
      </div>
    </StaffLayout>
  )
}
