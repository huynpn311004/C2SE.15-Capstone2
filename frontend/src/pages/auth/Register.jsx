import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'

import './Register.css'

const POLICY_CONTENT = {
  terms: {
    title: 'Điều khoản sử dụng',
    updatedAt: 'Áp dụng từ 28/03/2026',
    sections: [
      {
        heading: '1. Tài khoản người dùng',
        body:
          'Bạn cần cung cấp thông tin chính xác và tự bảo mật thông tin đăng nhập. Mọi hoạt động phát sinh từ tài khoản được xem là do bạn thực hiện.',
      },
      {
        heading: '2. Hành vi không được phép',
        body:
          'Không giả mạo danh tính, không truy cập trái phép hệ thống, không sử dụng nền tảng cho mục đích vi phạm pháp luật.',
      },
      {
        heading: '3. Quyền của nền tảng',
        body:
          'SEIMS có thể tạm ngưng hoặc điều chỉnh dịch vụ để bảo trì, nâng cấp hoặc theo yêu cầu pháp lý khi cần thiết.',
      },
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật',
    updatedAt: 'Cập nhật lần cuối 28/03/2026',
    sections: [
      {
        heading: '1. Dữ liệu thu thập',
        body:
          'Chúng tôi thu thập thông tin đăng ký cơ bản như họ tên, email, số điện thoại và dữ liệu kỹ thuật phục vụ vận hành hệ thống.',
      },
      {
        heading: '2. Mục đích sử dụng',
        body:
          'Dữ liệu được dùng để tạo tài khoản, xác thực đăng nhập, hỗ trợ giao dịch và nâng cao chất lượng dịch vụ.',
      },
      {
        heading: '3. Bảo vệ thông tin',
        body:
          'SEIMS áp dụng các biện pháp bảo mật phù hợp để hạn chế truy cập trái phép và giảm rủi ro lộ lọt dữ liệu cá nhân.',
      },
    ],
  },
};

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [activePolicy, setActivePolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('')

  const { register } = useAuth()
  const navigate = useNavigate()
  const policyModal = activePolicy ? POLICY_CONTENT[activePolicy] : null;

  useEffect(() => {
    if (!activePolicy) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setActivePolicy(null);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activePolicy]);

  function openPolicyModal(type, event) {
    event.preventDefault();
    event.stopPropagation();
    setActivePolicy(type);
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Tên đăng nhập ít nhất 3 ký tự.');
      return
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.');
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu ít nhất 6 ký tự.');
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return
    }
    if (!agreeTerms) {
      setError('Bạn cần đồng ý điều khoản sử dụng.');
      return
    }

    setLoading(true)
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      setMessage('Đăng ký thành công! Vui lòng đăng nhập.')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <nav className="register-top-nav" aria-label="Điều hướng phụ">
        <Link to="/">Về Trang Chủ</Link>
      </nav>

      <div className="register-shell">
        <aside className="register-brand" aria-labelledby="register-brand-title">
          <span className="register-brand-badge">SEIMS</span>
          <h1 id="register-brand-title">Tham gia cùng SEIMS</h1>
          <p>
            Tạo tài khoản để tiếp cận các sản phẩm cận hạn với mức giá tốt,
            đặt hàng nhanh chóng và theo dõi toàn bộ quá trình mua sắm.
          </p>
          <ul className="register-brand-list">
            <li>Quản lý đơn hàng thuận tiện</li>
            <li>Lưu trữ lịch sử mua sắm</li>
            <li>Cập nhật ưu đãi mới nhất từ cửa hàng</li>
          </ul>
        </aside>

        <div className="register-panel">
          <div className="register-card">
            <header className="register-card-header">
              <h2>Tạo Tài Khoản</h2>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="register-field">
                <label htmlFor="reg-fullname">Họ Và Tên</label>
                <input
                  id="reg-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-username">Tên Đăng Nhập</label>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
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
                  placeholder="@gmail.com"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-phone">Số Điện Thoại (tùy chọn)</label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="xxxx xxx xxx"
                />
              </div>

              <div className="register-field">
                <label htmlFor="reg-password">Mật Khẩu</label>
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
                <label htmlFor="reg-confirm">Nhập Lại Mật Khẩu</label>
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
                <label className="register-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <span>Hiển thị mật khẩu</span>
                </label>
                <label className="register-checkbox-label register-terms-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <button
                      type="button"
                      className="register-inline-link"
                      onClick={(event) => openPolicyModal('terms', event)}
                    >
                      Điều Khoản Sử Dụng
                    </button>{' '}
                    &{' '}
                    <button
                      type="button"
                      className="register-inline-link"
                      onClick={(event) => openPolicyModal('privacy', event)}
                    >
                      Chính Sách Bảo Mật
                    </button>
                  </span>
                </label>
              </div>

              <button type="submit" className="register-submit" disabled={loading}>
                {loading ? 'Đang Tạo Tài Khoản…' : 'Đăng Ký'}
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
              Đã có tài khoản? <Link to="/login">Đăng Nhập</Link>
            </footer>
          </div>
        </div>
      </div>

      {policyModal ? (
        <div
          className="register-modal-backdrop"
          role="presentation"
          onClick={() => setActivePolicy(null)}
        >
          <section
            className="register-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-policy-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="register-modal-header">
              <div>
                <h3 id="register-policy-title">{policyModal.title}</h3>
                <p>{policyModal.updatedAt}</p>
              </div>
              <button
                type="button"
                className="register-modal-close"
                aria-label="Đóng"
                onClick={() => setActivePolicy(null)}
              >
                ×
              </button>
            </header>

            <div className="register-modal-body">
              {policyModal.sections.map((section) => (
                <section key={section.heading} className="register-policy-section">
                  <h4>{section.heading}</h4>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
