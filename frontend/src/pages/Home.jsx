import { Link } from 'react-router-dom'
import './Home.css'
import heroImage from '../assets/hero.png'

export default function Home() {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo">SEIMS Platform</div>
        <div className="auth-buttons">
          <Link to="/login" className="landing-btn landing-btn-login">
            Đăng nhập
          </Link>
          <Link to="/register" className="landing-btn landing-btn-register">
            Đăng ký
          </Link>
        </div>
      </header>

      <section
        className="hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(13, 92, 86, 0.72), rgba(15, 118, 110, 0.62)), url(${heroImage})`,
        }}
      >
        <div className="hero-content">
          <h1>SEIMS - Smart Expiry Integration Management System</h1>
          <p>
            Nền tảng trung gian giúp siêu thị và cửa hàng quản lý hàng cận hạn, tối ưu giảm giá,
            hỗ trợ donation và kết nối vận hành đa vai trò trên cùng một hệ thống.
          </p>
          <Link to="/register" className="landing-cta-button">
            Bắt đầu với SEIMS
          </Link>
        </div>
      </section>

      <section className="features-section" id="gioi-thieu">
        <h2>Tính năng nổi bật</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">Inventory</div>
            <h3>Quản lý tồn kho theo lô</h3>
            <p>Theo dõi hạn sử dụng, số lượng và cảnh báo cận hạn theo từng lô hàng.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">Discount</div>
            <h3>Giảm giá tự động</h3>
            <p>Áp dụng chính sách giảm giá linh hoạt để tăng khả năng thu hồi doanh thu.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">Donation</div>
            <h3>Kết nối tổ chức từ thiện</h3>
            <p>Tạo và theo dõi quy trình donation minh bạch giữa cửa hàng và charity.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">Analytics</div>
            <h3>Báo cáo và phân tích</h3>
            <p>Hỗ trợ dashboard giám sát near-expiry, doanh thu thu hồi và hiệu suất vận hành.</p>
          </div>
        </div>
      </section>

      <section className="registration-section" aria-labelledby="registration-title">
        <h2 id="registration-title">Đăng ký tham gia nền tảng</h2>
        <p className="registration-lead">
          Bạn có thể chọn vai trò phù hợp để gửi yêu cầu tham gia hệ thống SEIMS.
        </p>

        <div className="registration-grid">
          <article className="registration-card">
            <h3>Đăng ký siêu thị</h3>
            <p>Phù hợp cho siêu thị hoặc chuỗi cửa hàng muốn tham gia quản lý hàng cận hạn.</p>
            <a
              href="https://forms.gle/U2CU3fx4xRF8NRZp9"
              target="_blank"
              rel="noopener noreferrer"
              className="registration-btn"
            >
              Đăng ký siêu thị
            </a>
          </article>

          <article className="registration-card">
            <h3>Đăng ký tổ chức từ thiện</h3>
            <p>Dành cho charity muốn tiếp nhận donation từ cửa hàng trên nền tảng SEIMS.</p>
            <a
              href="https://forms.gle/upNKQKbYe2hcRwxW9"
              target="_blank"
              rel="noopener noreferrer"
              className="registration-btn"
            >
              Đăng ký tổ chức từ thiện
            </a>
          </article>

          <article className="registration-card">
            <h3>Đăng ký giao hàng</h3>
            <p>Dành cho đối tác giao hàng muốn tham gia nền tảng SEIMS.</p>
            <a
              href="https://forms.gle/DiJp6TTvTXtxrzfc8"
              target="_blank"
              rel="noopener noreferrer"
              className="registration-btn"
            >
              Đăng ký giao hàng
            </a>
          </article>
        </div>
      </section>

      <section className="about-section">
        <h2>Về nền tảng SEIMS</h2>
        <p>
          SEIMS được xây dựng để giảm lãng phí thực phẩm, hỗ trợ doanh nghiệp xử lý hàng tồn hiệu
          quả hơn và tạo giá trị cộng đồng thông qua donation.
        </p>
      </section>

      <footer className="footer">
        <p>© 2026 SEIMS. All rights reserved.</p>
        <p>Contact: seimshotro@gmail.com</p>
      </footer>
    </div>
  )
}
