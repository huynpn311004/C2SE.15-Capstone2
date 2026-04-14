import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { fetchCustomerProducts, fetchNearExpiryProducts, fetchCustomerSupermarkets } from "../../services/customerApi";
import './CustomerDashboard.css';

const CustomerDashboard = () => {
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
          const original = p.originalPrice || 0;
          const sale = p.salePrice || 0;
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
      <div className="customer-dashboard-stats">
        <div className="customer-dashboard-stat-card">
          <div className="customer-dashboard-stat-header">
          </div>
          <div className="customer-dashboard-stat-value">{stats.totalProducts}</div>
          <div className="customer-dashboard-stat-label">Sản phẩm khả dụng</div>
        </div>

        <div className="customer-dashboard-stat-card">
          <div className="customer-dashboard-stat-header">
          </div>
          <div className="customer-dashboard-stat-value">{stats.avgDiscount}%</div>
          <div className="customer-dashboard-stat-label">Giảm giá trung bình</div>
        </div>

        <div className="customer-dashboard-stat-card customer-dashboard-stat-warning">
          <div className="customer-dashboard-stat-header">
          </div>
          <div className="customer-dashboard-stat-value">{stats.expiringSoon}</div>
          <div className="customer-dashboard-stat-label">Sắp hết hạn (≤ 2 ngày)</div>
        </div>

        <div className="customer-dashboard-stat-card">
          <div className="customer-dashboard-stat-header">
          </div>
          <div className="customer-dashboard-stat-value">{(stats.totalSavings / 1000).toFixed(0)}K</div>
          <div className="customer-dashboard-stat-label">Tiết kiệm tối đa</div>
        </div>
      </div>

    </div>
  );
};

export default CustomerDashboard;
