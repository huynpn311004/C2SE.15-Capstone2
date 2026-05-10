import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'

import './Login.css'
export default function Login() {
  const ADMIN_CONTACT = {
    email: 'seimshotro@gmail.com',
  }

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  function routeByRole(role) {
    const routes = {
      system_admin: '/admin/dashboard',
      supermarket_admin: '/supermarketadmin/dashboard',
      store_staff: '/staff/dashboard',
      customer: '/customer/home',
      charity: '/charity/dashboard',
      delivery_partner: '/delivery/dashboard',
    }
    return routes[role] || '/'
  }

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess('')
    setError('')

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
      setSuccess('Đăng nhập thành công!')
      setTimeout(() => {
        navigate(routeByRole(nextRole))
      }, 1500)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      if (detail) {
        if (status === 423 || detail.toLowerCase().includes('lien he admin') || detail.toLowerCase().includes('locked')) {
          setError(`Tài khoản đã bị khóa. Vui lòng liên hệ Admin (Email: ${ADMIN_CONTACT.email}, Hotline: ${ADMIN_CONTACT.hotline})`)
        } else {
          setError(detail)
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
            Nền tảng tích hợp giúp các chuỗi siêu thị theo dõi và quản lý hàng cận hạn,
            triển khai chiến lược giảm giá linh hoạt và hỗ trợ hoạt động quyên góp.
            Giải pháp hướng đến việc giảm lãng phí, tối ưu vận hành và nâng cao giá trị bền vững cho doanh nghiệp.
          </p>
          <ul className="login-brand-list">
            <li>Theo dõi & quản lý hàng cận hạn sử dụng</li>
            <li>Chiến lược giảm giá linh hoạt theo thời gian thực</li>
            <li>Hỗ trợ quyên góp từ thiện hiệu quả</li>
            <li>Giảm lãng phí — tối ưu vận hành — phát triển bền vững</li>
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
            </form>

            <footer className="login-footer">
              Chưa có tài khoản? <Link to="/register">Đăng ký Khách Hàng</Link>
            </footer>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {(success || error) && (
        <div className={`login-toast ${success ? 'success' : 'error'}`}>
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
  )
}
