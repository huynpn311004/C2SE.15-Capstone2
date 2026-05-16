import { useEffect, useMemo, useState } from 'react'
import DeliveryLayout from '../../components/layout/DeliveryLayout'
import { useAuth } from '../../services/AuthContext'
import { updateDeliveryProfile, changeDeliveryPassword } from '../../services/deliveryApi'
import './DeliverySettings.css'

const DELIVERY_PROFILE_STORAGE_KEY = 'seims_delivery_profile'
const AUTH_STORAGE_KEY = 'seims_auth_user'

function Toast({ type, message, visible, onClose }) {
  if (!visible) return null;
  
  const isError = type === 'error';

  return (
    <div className={`settings-toast ${isError ? 'error' : 'success'}`}>
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

const DEFAULT_DELIVERY_PROFILE = {
  username: 'driver',
  fullName: 'Đối Tác Giao Hàng',
  email: 'delivery@seims.vn',
  phone: '0900000000',
  position: 'Delivery Partner',
}

export default function DeliverySettings() {
  const { user } = useAuth()
  const [formData, setFormData] = useState(DEFAULT_DELIVERY_PROFILE)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ visible: true, message: msg, type })
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500)
  }

  useEffect(() => {
    const profile = {
      username: user?.username || DEFAULT_DELIVERY_PROFILE.username,
      fullName: user?.full_name || DEFAULT_DELIVERY_PROFILE.fullName,
      email: user?.email || DEFAULT_DELIVERY_PROFILE.email,
      phone: user?.phone || DEFAULT_DELIVERY_PROFILE.phone,
      position: 'Delivery Partner',
    }
    setFormData(profile)
    localStorage.setItem(DELIVERY_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    window.dispatchEvent(new Event('seims-delivery-profile-updated'))
  }, [user])

  const isDirty = useMemo(() => {
    const current = {
      username: user?.username || DEFAULT_DELIVERY_PROFILE.username,
      fullName: user?.full_name || DEFAULT_DELIVERY_PROFILE.fullName,
      email: user?.email || DEFAULT_DELIVERY_PROFILE.email,
      phone: user?.phone || DEFAULT_DELIVERY_PROFILE.phone,
      position: 'Delivery Partner',
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

    if (!user?.id) {
      showToast('Không tìm thấy thông tin tài khoản hiện tại.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10}$/

    if (!formData.email.trim()) {
      showToast('Email không được để trống.')
      return
    }

    if (!emailRegex.test(formData.email.trim())) {
      showToast('Email không đúng định dạng.')
      return
    }

    if (!formData.phone.trim()) {
      showToast('Số điện thoại không được để trống.')
      return
    }

    if (!phoneRegex.test(formData.phone.trim())) {
      showToast('Số điện thoại phải có đúng 10 chữ số.')
      return
    }

    try {
      const nextFormData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
      }

      // Gọi API cập nhật backend
      await updateDeliveryProfile(nextFormData)

      setFormData(prev => ({ ...prev, ...nextFormData }))
      localStorage.setItem(DELIVERY_PROFILE_STORAGE_KEY, JSON.stringify({ ...formData, ...nextFormData }))
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          ...user,
          full_name: nextFormData.fullName,
          email: nextFormData.email,
          phone: nextFormData.phone,
        }),
      )
      window.dispatchEvent(new Event('seims-delivery-profile-updated'))
      showToast('Đã lưu thay đổi thành công.', 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Lưu thay đổi thất bại.', 'error')
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
      showToast('Không tìm thấy thông tin tài khoản hiện tại.')
      return
    }

    if (!passwordData.currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại.')
      return
    }

    try {
      setIsChangingPassword(true)
      await changeDeliveryPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      showToast('Đổi mật khẩu thành công.', 'success')
    } catch (err) {
      showToast(err?.response?.data?.detail || err.message || 'Đổi mật khẩu thất bại.', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <DeliveryLayout>
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
                placeholder="vd: driver_seims"
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
                placeholder="delivery@seims.vn"
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
            <button type="submit" className="settings-btn" disabled={isChangingPassword}>
              {isChangingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </div>
        </form>
        <Toast type={toast.type} visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      </div>
    </DeliveryLayout>
  )
}
