import { useState } from 'react'
import { Link } from 'react-router-dom'

import './Login.css'

/**
 * Trang đăng nhập SEIMS — chỉ dùng useState + form cơ bản.
 * Khi nhóm nối API: gọi API.post('/auth/login', ...) trong handleSubmit.
 */
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
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
    // Giả lập gọi server — thay bằng axios + endpoint thật khi backend xong
    window.setTimeout(() => {
      setLoading(false)
      setMessage(
        'Đăng nhập (demo): dữ liệu hợp lệ. Nhóm có thể thay bằng gọi API và lưu token.',
      )
    }, 600)
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
                <a href="#quen-mat-khau">Quên mật khẩu?</a>
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Đang xử lý…' : 'Đăng nhập'}
              </button>

              {error ? (
                <p className="login-message error" role="alert">
                  {error}
                </p>
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
