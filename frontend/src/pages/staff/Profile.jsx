import { useState } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import './Profile.css'

const defaultProfile = {
  fullName: 'Trần Nhân Viên',
  email: 'staff01@seims.vn',
  phone: '0908 123 456',
  store: 'BigMart Trung Tâm',
  role: 'Nhân Viên Cửa Hàng',
}

export default function Profile() {
  const [profile, setProfile] = useState(defaultProfile)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

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

    setSaved(true)
  }

  return (
    <StaffLayout>
      <div className="profile-page">
      {/* PROFILE CARD */}
      <div className="profile-card">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-form-grid">
            <div className="profile-form-column">
              <div className="profile-form-field">
                <label>Họ Tên</label>
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Nhập họ tên"
                />
              </div>
              <div className="profile-form-field">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Nhập email"
                />
              </div>
              <div className="profile-form-field">
                <label>Số Điện Thoại</label>
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>

            <div className="profile-form-column">
              <div className="profile-form-field">
                <label>Cửa Hàng</label>
                <input
                  type="text"
                  name="store"
                  value={profile.store}
                  onChange={handleChange}
                  className="profile-input"
                  placeholder="Nhập tên cửa hàng"
                />
              </div>
              <div className="profile-form-field">
                <label>Chức Vụ</label>
                <input
                  type="text"
                  name="role"
                  value={profile.role}
                  disabled
                  className="profile-input profile-input-disabled"
                />
              </div>
            </div>
          </div>

          {error && <p className="profile-error">{error}</p>}
          {saved && <p className="profile-success">Hồ sơ đã được cập nhật thành công!</p>}

          <div className="profile-form-footer">
            <button type="submit" className="btn-large profile-btn-save">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
      </div>
    </StaffLayout>
  )
}
