import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'

import './Login.css'

/**
 * Trang đăng nhập SEIMS — chỉ dùng useState + form cơ bản.
 * Khi nhóm nối API: gọi API.post('/auth/login', ...) trong handleSubmit.
 */
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
      setMessage(response?.message || 'Dang nhap thanh cong.')
      setTimeout(() => {
        navigate(routeByRole(nextRole))
      }, 500)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      if (detail) {
        setError(detail)
        if (status === 423 || detail.toLowerCase().includes('lien he admin')) {
          setShowAdminContact(true)
        }
      } else {
        setError('Dang nhap that bai. Vui long thu lai.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <nav className="login-top-nav" aria-label="Điều hướng phụ">
        <Link to="/">← Về trang chủ</Link>
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
              <h2>Đăng nhập</h2>
              <span>Nhập tài khoản được quản trị viên cấp</span>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-username">Tên đăng nhập hoặc email</label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: nv_cua_hang_01"
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Mật khẩu</label>
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
                <Link to="/forgot-password">Quên mật khẩu?</Link>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Đang xử lý…' : 'Đăng nhập'}
              </button>

              {error ? (
                <p className="login-message error" role="alert">
                  {error}
                </p>
              ) : null}
              {showAdminContact ? (
                <div className="login-message error" role="status">
                  <strong>Tai khoan cua ban da bi khoa.</strong>
                  <br />
                  Vui long lien he admin de mo khoa:
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
              Chưa có tài khoản? <Link to="/register">Đăng ký khách hàng</Link>
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
