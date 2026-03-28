import { useNavigate } from "react-router-dom";
import { mockProducts } from "../../services/mockProducts";
import './CustomerDashboard.css';

const CustomerHome = () => {
  const navigate = useNavigate();

  const totalProducts = mockProducts.length;
  const avgDiscount = Math.round(mockProducts.reduce((sum, p) => sum + p.discount, 0) / totalProducts);
  const expiringSoon = mockProducts.filter(p => p.daysLeft <= 2).length;
  const totalSavings = mockProducts.reduce((sum, p) => sum + (p.originalPrice - p.salePrice), 0);

  return (
    <div className="customer-page">
      {/* Welcome Header */}
      <div className="customer-welcome">
        <div>
          <h2>Xin chào, Khách hàng!</h2>
          <p>Theo dõi nhanh giỏ hàng, đơn hàng và đi tới mục mua sắm</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">📦</span>
            <span className="customer-stat-change">+{totalProducts}</span>
          </div>
          <div className="customer-stat-value">{totalProducts}</div>
          <div className="customer-stat-label">Sản phẩm khả dụng</div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">📉</span>
            <span className="customer-stat-change">+{avgDiscount}%</span>
          </div>
          <div className="customer-stat-value">{avgDiscount}%</div>
          <div className="customer-stat-label">Giảm giá trung bình</div>
        </div>

        <div className="customer-stat-card customer-stat-card-warning">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">⏰</span>
            <span className="customer-stat-change">{expiringSoon}</span>
          </div>
          <div className="customer-stat-value">{expiringSoon}</div>
          <div className="customer-stat-label">Sắp hết hạn (≤ 2 ngày)</div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">💰</span>
            <span className="customer-stat-change">+{(totalSavings / 1000).toFixed(0)}K</span>
          </div>
          <div className="customer-stat-value">{(totalSavings / 1000).toFixed(0)}K</div>
          <div className="customer-stat-label">Tiết kiệm tối đa</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="customer-products-section">
        <div className="customer-section-header">
          <div>
            <h3 className="customer-section-title">Lối tắt</h3>
            <p className="customer-section-subtitle">Đi tới đúng chức năng bạn cần</p>
          </div>
        </div>

        <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <button className="customer-add-to-cart-btn" onClick={() => navigate('/customer/shop')}>
            🛍 Mua sắm
          </button>
          <button className="customer-add-to-cart-btn" onClick={() => navigate('/customer/cart')}>
            🛒 Xem giỏ hàng
          </button>
          <button className="customer-add-to-cart-btn" onClick={() => navigate('/customer/orders')}>
            📦 Theo dõi đơn hàng
          </button>
          <button className="customer-add-to-cart-btn" onClick={() => navigate('/customer/profile')}>
            👤 Cập nhật tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
