import { useState } from 'react'
import { Link } from 'react-router-dom'

import './Register.css'

/**
 * Đăng ký tài khoản khách hàng (customer) — demo validate phía client.
 * CSS riêng Register.css, class register-* (không dùng login-*).
 */
export default function Register() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên.')
      return
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Tên đăng nhập ít nhất 3 ký tự.')
      return
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu ít nhất 6 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.')
      return
    }
    if (!agreeTerms) {
      setError('Bạn cần đồng ý điều khoản sử dụng.')
      return
    }

    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      setMessage(
        'Đăng ký (demo) thành công. Nhóm thay bằng API POST /auth/register và chuyển sang đăng nhập.',
      )
    }, 700)
  }

  return (
    <div className="register-page">
      <nav className="register-top-nav" aria-label="Điều hướng phụ">
        <Link to="/">← Về trang chủ</Link>
      </nav>

      <div className="register-shell">
        <aside className="register-brand" aria-labelledby="register-brand-title">
          <span className="register-brand-badge">SEIMS</span>
          <h1 id="register-brand-title">Tham gia cùng SEIMS</h1>
          <p>
            Đăng ký để xem sản phẩm cận hạn, khuyến mãi và đặt hàng tại các cửa
            hàng tham gia nền tảng.
          </p>
          <ul className="register-brand-list">
            <li>Theo dõi đơn hàng và lịch sử mua</li>
            <li>Nhận thông báo ưu đãi theo cửa hàng</li>
          </ul>
        </aside>

        <div className="register-panel">
          <div className="register-card">
            <header className="register-card-header">
              <h2>Tạo tài khoản</h2>
              <span>Dành cho khách hàng — tài khoản nội bộ do admin cấp</span>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="register-field">
                <label htmlFor="reg-fullname">Họ và tên</label>
                <input
                  id="reg-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-username">Tên đăng nhập</label>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="chuỗi không dấu, vd: nguyenvana"
                />
                <p className="register-field-hint">
                  Ít nhất 3 ký tự, dùng để đăng nhập.
                </p>
              </div>

              <div className="register-field">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@email.com"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-phone">Số điện thoại (tùy chọn)</label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-password">Mật khẩu</label>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-confirm">Nhập lại mật khẩu</label>
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="register-row">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Hiển thị mật khẩu
                </label>
              </div>

              <div className="register-field register-field--checkbox">
                <label className="register-terms-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <a href="#dieu-khoan">Điều khoản sử dụng</a> và{' '}
                    <a href="#bao-mat">Chính sách bảo mật</a>
                  </span>
                </label>
              </div>

              <button type="submit" className="register-submit" disabled={loading}>
                {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
              </button>

              {error ? (
                <p
                  className="register-message register-message--error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {message ? (
                <p
                  className="register-message register-message--info"
                  role="status"
                >
                  {message}
                </p>
              ) : null}
            </form>

            <footer className="register-footer">
              Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
