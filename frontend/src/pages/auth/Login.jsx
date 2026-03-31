import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'

import './Login.css'
export default function Login() {
  const ADMIN_CONTACT = {
    email: 'admin@seims.vn',
    hotline: '1900-0000',
  }

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showAdminContact, setShowAdminContact] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  function routeByRole(role) {
    const routes = {
      system_admin: '/admin/dashboard',
      supermarket_admin: '/supermarketadmin/dashboard',
      store_staff: '/staff/dashboard',
      customer: '/customer/home',
      charity: '/charity/dashboard',
      delivery_partner: '/',
    }
    return routes[role] || '/'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setShowAdminContact(false)

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập hoặc email.')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.')
      return
    }

    setLoading(true)
    try {
      const response = await login({
        username: username.trim(),
        password,
      })
      const nextRole = response?.user?.role
      setMessage('Đăng nhập thành công!')
      setTimeout(() => {
        navigate(routeByRole(nextRole))
      }, 1500)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      if (detail) {
        setError(detail)
        if (status === 423 || detail.toLowerCase().includes('lien he admin')) {
          setShowAdminContact(true)
        }
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <nav className="login-top-nav" aria-label="Điều hướng phụ">
        <Link to="/">Về Trang Chủ</Link>
      </nav>

      <div className="login-shell">
        <aside className="login-brand" aria-labelledby="login-brand-title">
          <span className="login-brand-badge">SEIMS</span>
          <h1 id="login-brand-title">Smart Expiry Integration Management</h1>
          <p>
            Nền tảng quản lý hàng cận hạn, giảm giá và donation cho chuỗi siêu
            thị — đăng nhập theo vai trò được cấp.
          </p>
          <ul className="login-brand-list">
            <li>Quản trị hệ thống, siêu thị, cửa hàng</li>
            <li>Khách hàng, từ thiện, đối tác giao hàng</li>
          </ul>
        </aside>

        <div className="login-panel">
          <div className="login-card">
            <header className="login-card-header">
              <h2>Đăng Nhập</h2>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-username">Tên Đăng Nhập Hoặc Email</label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc email"
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Mật Khẩu</label>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="login-row">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Hiển thị mật khẩu
                </label>
                <Link to="/forgot-password">Quên Mật Khẩu?</Link>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Đang Xử Lý…' : 'Đăng Nhập'}
              </button>

              {error ? (
                <p className="login-message error" role="alert">
                  {error}
                </p>
              ) : null}
              {showAdminContact ? (
                <div className="login-message error" role="status">
                  <strong>Tài khoản bạn đã bị khóa.</strong>
                  <br />
                  Vui lòng liên hệ đến admin:
                  <br />
                  Email: {ADMIN_CONTACT.email}
                  <br />
                  Hotline: {ADMIN_CONTACT.hotline}
                </div>
              ) : null}
              {message ? (
                <p className="login-message info" role="status">
                  {message}
                </p>
              ) : null}
            </form>

            <footer className="login-footer">
              Chưa có tài khoản? <Link to="/register">Đăng ký Khách Hàng</Link>
              <br />
              Đại diện siêu thị?{' '}
              <a href="#dang-ky-sieu-thi">Gửi hồ sơ tham gia</a>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
