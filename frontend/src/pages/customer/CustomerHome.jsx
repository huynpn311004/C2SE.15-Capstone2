import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { fetchCustomerProducts, fetchNearExpiryProducts, fetchCustomerSupermarkets } from "../../services/customerApi";
import './CustomerHome.css';

const CustomerHome = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgDiscount: 0,
    expiringSoon: 0,
    totalSavings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [products, nearExpiry, supermarkets] = await Promise.all([
          fetchCustomerProducts(),
          fetchNearExpiryProducts({ maxDays: 2 }),
          fetchCustomerSupermarkets(),
        ]);

        const totalProducts = products.length;
        const avgDiscount = totalProducts > 0
          ? Math.round(products.reduce((sum, p) => sum + (p.discount || 0), 0) / totalProducts)
          : 0;
        const expiringSoon = nearExpiry.length;
        const totalSavings = products.reduce((sum, p) => {
          const original = p.original_price || p.originalPrice || 0;
          const sale = p.sale_price || p.salePrice || 0;
          return sum + (original - sale);
        }, 0);

        setStats({ totalProducts, avgDiscount, expiringSoon, totalSavings });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="customer-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)' }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      {/* Stats Grid */}
      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">📦</span>
            <span className="customer-stat-change">+{stats.totalProducts}</span>
          </div>
          <div className="customer-stat-value">{stats.totalProducts}</div>
          <div className="customer-stat-label">Sản phẩm khả dụng</div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">📉</span>
            <span className="customer-stat-change">+{stats.avgDiscount}%</span>
          </div>
          <div className="customer-stat-value">{stats.avgDiscount}%</div>
          <div className="customer-stat-label">Giảm giá trung bình</div>
        </div>

        <div className="customer-stat-card customer-stat-card-warning">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">⏰</span>
            <span className="customer-stat-change">{stats.expiringSoon}</span>
          </div>
          <div className="customer-stat-value">{stats.expiringSoon}</div>
          <div className="customer-stat-label">Sắp hết hạn (≤ 2 ngày)</div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">💰</span>
            <span className="customer-stat-change">+{(stats.totalSavings / 1000).toFixed(0)}K</span>
          </div>
          <div className="customer-stat-value">{(stats.totalSavings / 1000).toFixed(0)}K</div>
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
