import { useState, useEffect, useMemo } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import {
  fetchCharityProfile,
  updateCharityProfile,
  changeCharityPassword,
} from '../../services/charityApi'
import './CharitySettings.css'

export default function CharitySettings() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    orgName: '',
    email: '',
    phone: '',
    address: '',
  })
  const [originalData, setOriginalData] = useState({
    username: '',
    fullName: '',
    orgName: '',
    email: '',
    phone: '',
    address: '',
  })
  const [toastSuccess, setToastSuccess] = useState('')
  const [toastError, setToastError] = useState('')
  const [saving, setSaving] = useState(false)

  const isDirty = useMemo(() => {
    return JSON.stringify(originalData) !== JSON.stringify(formData)
  }, [formData, originalData])

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (toastSuccess || toastError) {
      const timer = setTimeout(() => {
        setToastSuccess('')
        setToastError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [toastSuccess, toastError])

  async function loadProfile() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchCharityProfile()
      const profile = {
        username: data.username || '',
        fullName: data.fullName || '',
        orgName: data.orgName || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
      }
      setFormData(profile)
      setOriginalData(profile)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể tải thông tin')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setToastSuccess('')
    setToastError('')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\d{10}$/

    if (!formData.email.trim()) {
      setToastError('Email không được để trống.')
      setSaving(false)
      return
    }

    if (!emailRegex.test(formData.email.trim())) {
      setToastError('Email không đúng định dạng.')
      setSaving(false)
      return
    }

    if (formData.phone.trim() && !phoneRegex.test(formData.phone.trim())) {
      setToastError('Số điện thoại phải có đúng 10 chữ số.')
      setSaving(false)
      return
    }

    try {
      await updateCharityProfile(formData)
      setOriginalData(formData)
      setToastSuccess('Đã lưu thay đổi thành công.')
    } catch (err) {
      setToastError(err?.response?.data?.detail || err.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  function handlePasswordChange(e) {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setToastSuccess('')
    setToastError('')

    if (passwordData.newPassword.length < 6) {
      setToastError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToastError('Mật khẩu xác nhận không khớp.')
      return
    }

    setChangingPassword(true)
    try {
      await changeCharityPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setToastSuccess('Đổi mật khẩu thành công.')
    } catch (err) {
      setToastError(err?.response?.data?.detail || err.message || 'Đổi mật khẩu thất bại')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <CharityLayout>
        <div className="chsettings-loading">
          <div className="spinner"></div>
          <span>Đang tải thông tin...</span>
        </div>
      </CharityLayout>
    )
  }

  if (error) {
    return (
      <CharityLayout>
        <div className="chsettings-error-banner">
          <p>{error}</p>
          <button onClick={loadProfile} className="chsettings-retry-btn">Thử lại</button>
        </div>
      </CharityLayout>
    )
  }

  return (
    <CharityLayout>
      <div className="chsettings-page">
        {/* THONG TIN TAI KHOAN */}
        <form className="chsettings-card" onSubmit={handleSave}>
          <h3 className="chsettings-section-title">Thông Tin Tài Khoản</h3>
          <div className="chsettings-grid">
            <label className="chsettings-field chsettings-field-disabled">
              <span>Tên Đăng Nhập</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                readOnly
                disabled
                placeholder="Không thể chỉnh sửa"
              />
            </label>

            <label className="chsettings-field">
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

            <label className="chsettings-field">
              <span>Tổ Chức</span>
              <input
                type="text"
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                placeholder="Tên tổ chức từ thiện"
              />
            </label>

            <label className="chsettings-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="charity@abc.vn"
                required
              />
            </label>

            <label className="chsettings-field">
              <span>Số Điện Thoại</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0900000000"
              />
            </label>

            <label className="chsettings-field chsettings-field-disabled">
              <span>Địa Chỉ</span>
              <input
                type="text"
                name="address"
                value={formData.address}
                readOnly
                disabled
                placeholder="Không thể chỉnh sửa"
                title="Địa chỉ không thể chỉnh sửa"
              />
            </label>
          </div>

          <div className="chsettings-actions">
            <button type="submit" className="chsettings-btn" disabled={!isDirty || saving}>
              {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>

        {/* DOI MAT KHAU */}
        <form className="chsettings-card" onSubmit={handleChangePassword}>
          <h3 className="chsettings-section-title">Đổi Mật Khẩu</h3>
          <div className="chsettings-grid chsettings-grid-single">
            <label className="chsettings-field">
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

            <label className="chsettings-field">
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

            <label className="chsettings-field">
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

          <div className="chsettings-actions">
            <button type="submit" className="chsettings-btn" disabled={changingPassword}>
              {changingPassword ? 'Đang xử lý...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </div>
        </form>

        {/* TOAST NOTIFICATION */}
        {(toastSuccess || toastError) && (
          <div className={`chsettings-toast ${toastSuccess ? 'success' : 'error'}`}>
            <div className="toast-content">
              <span className="toast-icon">
                {toastSuccess ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
              </span>
              <p className="toast-message">{toastSuccess || toastError}</p>
            </div>
            <button type="button" className="toast-close" onClick={() => { setToastSuccess(''); setToastError(''); }}>×</button>
          </div>
        )}
      </div>
    </CharityLayout>
  )
}
