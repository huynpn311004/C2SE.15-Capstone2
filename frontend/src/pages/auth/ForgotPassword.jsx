import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../services/api';

import './ForgotPassword.css';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'reset'

  const token = searchParams.get('token');
  const navigate = useNavigate();

  // Auto-detect reset step if token exists
  useState(() => {
    if (token) {
      setStep('reset');
    }
  }, [token]);

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setMessage('Đã gửi link đặt lại mật khẩu đến email của bạn!');
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Token không hợp lệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        token: token,
        new_password: password,
      });
      setMessage('Đặt lại mật khẩu thành công!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Token không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-page">
      <nav className="forgot-top-nav" aria-label="Điều hướng phụ">
        <Link to="/">← Về trang chủ</Link>
        <Link to="/login">Đăng nhập</Link>
      </nav>

      <div className="forgot-shell">
        <aside className="forgot-brand" aria-labelledby="forgot-brand-title">
          <span className="forgot-brand-badge">SEIMS</span>
          <h1 id="forgot-brand-title">Khôi phục tài khoản</h1>
          <p>
            Nhập email đã đăng ký để nhận link đặt lại mật khẩu.
          </p>
        </aside>

        <div className="forgot-panel">
          <div className="forgot-card">
            {step === 'request' && (
              <>
                <header className="forgot-card-header">
                  <h2>Quên mật khẩu?</h2>
                  <span>Nhập email đã đăng ký</span>
                </header>

                <form onSubmit={handleRequest} noValidate>
                  <div className="forgot-field">
                    <label htmlFor="forgot-email">Email</label>
                    <input
                      id="forgot-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@email.com"
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="forgot-submit" disabled={loading}>
                    {loading ? 'Đang xử lý…' : 'Gửi link đặt lại'}
                  </button>

                  {error ? (
                    <p className="forgot-message forgot-message--error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="forgot-message forgot-message--success" role="status">
                      {message}
                    </p>
                  ) : null}
                </form>
              </>
            )}

            {step === 'reset' && (
              <>
                <header className="forgot-card-header">
                  <h2>Đặt lại mật khẩu</h2>
                  <span>Nhập mật khẩu mới</span>
                </header>

                <form onSubmit={handleReset} noValidate>
                  <div className="forgot-field">
                    <label htmlFor="reset-password">Mật khẩu mới</label>
                    <input
                      id="reset-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      disabled={loading}
                    />
                  </div>

                  <div className="forgot-field">
                    <label htmlFor="reset-confirm">Nhập lại mật khẩu</label>
                    <input
                      id="reset-confirm"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>

                  <div className="forgot-row">
                    <label className="forgot-checkbox-label">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                        disabled={loading}
                      />
                      Hiển thị mật khẩu
                    </label>
                  </div>

                  <button type="submit" className="forgot-submit" disabled={loading}>
                    {loading ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
                  </button>

                  {error ? (
                    <p className="forgot-message forgot-message--error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="forgot-message forgot-message--success" role="status">
                      {message}
                    </p>
                  ) : null}
                </form>
              </>
            )}

            {step === 'success' && (
              <>
                <div className="forgot-success-icon">✓</div>
                <h2 className="forgot-success-title">Email đã được gửi!</h2>
                <p className="forgot-success-text">
                  Kiểm tra hộp thư <strong>{email}</strong> và click vào link để đặt lại mật khẩu.
                </p>
                <p className="forgot-success-hint">
                  Nếu không thấy email, hãy kiểm tra thư mục spam.
                </p>
                <Link to="/login" className="forgot-back-link">
                  Quay lại đăng nhập
                </Link>
              </>
            )}

            {step !== 'success' && (
              <footer className="forgot-footer">
                Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
              </footer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
