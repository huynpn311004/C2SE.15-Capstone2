import { useEffect, useMemo, useState } from 'react'
import { fetchCustomerSetting, updateCustomerSetting, changeCustomerPassword } from '../../services/customerApi'
import { geocodeAddress, updateUserLocation } from '../../services/locationApi'
import LocationModal from '../../components/map/LocationModal'
import './CustomerSetting.css'

const AUTH_STORAGE_KEY = 'seims_auth_user'

const defaultSetting = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
}

export default function CustomerSetting() {
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState(defaultSetting)
  const [initialFormData, setInitialFormData] = useState(defaultSetting)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)

  useEffect(() => {
    async function loadSetting() {
      try {
        setLoading(true)
        const data = await fetchCustomerSetting()

        const authRaw = localStorage.getItem(AUTH_STORAGE_KEY)
        const authUser = authRaw ? JSON.parse(authRaw) : null

        const nextSetting = {
          username: authUser?.username || data.username || '',
          fullName: data.fullName || data.full_name || authUser?.full_name || '',
          email: data.email || authUser?.email || '',
          phone: data.phone || authUser?.phone || '',
          address: data.address || data.location || authUser?.address || '',
        }

        setFormData(nextSetting)
        setInitialFormData(nextSetting)
      } catch (err) {
        console.error('Lỗi khi tải thông tin:', err)
        setSaveError('Không thể tải thông tin tài khoản. Vui lòng đăng nhập lại.')
      } finally {
        setLoading(false)
      }
    }

    loadSetting()
  }, [])

  const isDirty = useMemo(() => {
    return JSON.stringify(initialFormData) !== JSON.stringify(formData)
  }, [formData, initialFormData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLocationSelect = (location) => {
    setFormData((prev) => ({ ...prev, address: location.address }))
  }

  const handleSave = async (e) => {
    e.preventDefault()

      setSaveMessage('')
      setSaveError('')

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const phoneRegex = /^\d{10}$/

      if (!formData.email.trim()) {
        setSaveError('Email không được để trống.')
        return
      }

      if (!emailRegex.test(formData.email.trim())) {
        setSaveError('Email không đúng định dạng.')
        return
      }

      if (formData.phone.trim() && !phoneRegex.test(formData.phone.trim())) {
        setSaveError('Số điện thoại phải có đúng 10 chữ số.')
        return
      }

      try {
        setIsSaving(true)

        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        }
        let geocodeWarning = ''

        // Chuyển đổi địa chỉ thành toạ độ và lưu lại vị trí
        if (payload.address && payload.address !== initialFormData.address) {
          try {
            const geocodeRes = await geocodeAddress(payload.address)
            console.log('Geocode result:', geocodeRes)
            if (geocodeRes && geocodeRes.latitude && geocodeRes.longitude) {
              await updateUserLocation(geocodeRes.latitude, geocodeRes.longitude, geocodeRes.display_name)
            } else {
              // Should not happen if API is consistent, but as a fallback:
              throw new Error('Invalid geocode response from server.')
            }
          } catch (err) {
            console.error('Lỗi geocoding:', err)
            // Bỏ lệnh chặn lưu, chỉ lưu lại cảnh báo
            geocodeWarning = ' (Lưu ý: Chưa thể định vị chính xác địa chỉ này trên bản đồ)'
          }
        }

      await updateCustomerSetting(payload)

      const authRaw = localStorage.getItem(AUTH_STORAGE_KEY)
      const authUser = authRaw ? JSON.parse(authRaw) : null
      if (authUser) {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            ...authUser,
            username: formData.username,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          }),
        )
      }

      setFormData((prev) => ({ ...prev, ...payload }))
      setInitialFormData((prev) => ({ ...prev, ...payload }))
      window.dispatchEvent(new Event('seims-customer-setting-updated'))
      setSaveMessage('Đã lưu thay đổi thành công.' + geocodeWarning)
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      console.error('Lỗi khi lưu:', err)
      setSaveError(err.message || 'Không thể lưu thay đổi. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleChangePassword = async (event) => {
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

    try {
      setIsChangingPassword(true)
      await changeCustomerPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage('Đổi mật khẩu thành công.')
      setTimeout(() => setPasswordMessage(''), 3000)
    } catch (err) {
      console.error('Lỗi đổi mật khẩu:', err)
      setPasswordError(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="customer-setting-page">
        <div className="customer-setting-loading">Đang tải thông tin...</div>
      </div>
    )
  }

  return (
    <div className="customer-setting-page">
      <form className="customer-setting-card" onSubmit={handleSave}>
        <h3 className="customer-setting-title">Thông Tin Tài Khoản</h3>

        <div className="customer-setting-grid">
          <label className="customer-setting-field">
            <span>Tên Đăng Nhập</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="customer_01"
              disabled
              title="Tên đăng nhập không thể thay đổi"
            />
          </label>

          <label className="customer-setting-field">
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

          <label className="customer-setting-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="@gmail.com"
              required
            />
          </label>

          <label className="customer-setting-field">
            <span>Số Điện Thoại</span>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại"
            />
          </label>

          <label className="customer-setting-field customer-setting-field-full">
            <span>Địa Chỉ Mặc Định</span>
            <div className="customer-setting-address-wrapper">
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              />
              <button
                type="button"
                className="customer-setting-location-btn"
                onClick={() => setShowLocationModal(true)}
                title="Chọn vị trí trên bản đồ"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </button>
            </div>
          </label>
        </div>

        <div className="customer-setting-actions">
          <button
            type="submit"
            className="customer-setting-btn"
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>

        {saveError ? <p className="customer-setting-msg-error">{saveError}</p> : null}
        {saveMessage ? <p className="customer-setting-msg-success">{saveMessage}</p> : null}
      </form>

      <form className="customer-setting-card" onSubmit={handleChangePassword}>
        <h3 className="customer-setting-title">Đổi Mật Khẩu</h3>

        <div className="customer-setting-grid customer-setting-grid-single">
          <label className="customer-setting-field">
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

          <label className="customer-setting-field">
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

          <label className="customer-setting-field">
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

        <div className="customer-setting-actions">
          <button
            type="submit"
            className="customer-setting-btn"
            disabled={isChangingPassword}
          >
            {isChangingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
          </button>
        </div>

        {passwordError ? <p className="customer-setting-msg-error">{passwordError}</p> : null}
        {passwordMessage ? <p className="customer-setting-msg-success">{passwordMessage}</p> : null}
      </form>

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleLocationSelect}
        initialAddress={formData.address}
      />
    </div>
  )
}
