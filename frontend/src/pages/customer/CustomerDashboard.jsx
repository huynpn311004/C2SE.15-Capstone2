import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerOrders, fetchCustomerDashboardSummary } from '../../services/customerApi';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [allOrders, setAllOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [activePromotions] = useState([
    { id: 1, code: 'GIAM10', description: 'Giảm 10% cho đơn hàng đầu tiên', minAmount: 100000, discount: 10, type: 'percent', expiresAt: '2026-04-30' },
    { id: 2, code: 'FREESHIP', description: 'Miễn phí vận chuyển', minAmount: 200000, discount: 0, type: 'shipping', expiresAt: '2026-04-25' },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, ordersData] = await Promise.all([
          fetchCustomerDashboardSummary().catch(() => ({
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            totalSpent: 0,
          })),
          fetchCustomerOrders('all').catch(() => []),
        ]);
        setSummary(summaryData);
        setAllOrders(ordersData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + 'đ';
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return { label: 'Chờ xác nhận', cls: 'customer-badge-pending' };
    if (s === 'preparing') return { label: 'Đang chuẩn bị', cls: 'customer-badge-processing' };
    if (s === 'ready') return { label: 'Sẵn sàng', cls: 'customer-badge-success' };
    if (s === 'delivering') return { label: 'Đang giao', cls: 'customer-badge-processing' };
    if (s === 'completed') return { label: 'Hoàn thành', cls: 'customer-badge-success' };
    if (s === 'cancelled') return { label: 'Đã hủy', cls: 'customer-badge-cancelled' };
    return { label: status, cls: 'customer-badge-default' };
  };

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return allOrders.slice(0, 10);
    return allOrders
      .filter(o => (o.status || '').toLowerCase() === orderFilter)
      .slice(0, 10);
  }, [allOrders, orderFilter]);

  const statCards = [
    {
      label: 'Tổng Đơn Hàng',
      value: summary.totalOrders,
      sub: 'tất cả',
      tone: 'default',
    },
    {
      label: 'Đang Xử Lý',
      value: summary.pendingOrders,
      sub: 'chờ xác nhận',
      tone: summary.pendingOrders > 0 ? 'warning' : 'default',
    },
    {
      label: 'Hoàn Thành',
      value: summary.completedOrders,
      sub: 'đã nhận hàng',
      tone: 'default',
    },
    {
      label: 'Tổng Chi Tiêu',
      value: formatPrice(summary.totalSpent),
      sub: 'tất cả đơn',
      tone: 'default',
    },
    {
      label: 'Mã Giảm Giá',
      value: activePromotions.length,
      sub: 'đang hoạt động',
      tone: activePromotions.length > 0 ? 'warning' : 'default',
    },
  ];

  if (loading) {
    return (
      <div className="customer-dashboard-loading">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div className="customer-dashboard-page">
      {/* Stats Grid — 5 columns */}
      <div className="customer-dashboard-stats">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`customer-dashboard-stat-card ${stat.tone === 'warning' ? 'stat-warning' : ''}`}
          >
            <div className="customer-dashboard-stat-value">{stat.value}</div>
            <div className="customer-dashboard-stat-label">{stat.label}</div>
            <div className="customer-dashboard-stat-sub">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Content Grid — 2 columns */}
      <div className="customer-dashboard-content-grid">
        {/* Orders Section */}
        <div className="customer-dashboard-section">
          <div className="customer-dashboard-section-header">
            <h3 className="customer-dashboard-section-title">Đơn Hàng Gần Đây</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="customer-order-filter-tabs">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'pending', label: 'Chờ xác nhận' },
                  { key: 'completed', label: 'Hoàn thành' },
                ].map(f => (
                  <button
                    key={f.key}
                    className={`customer-order-filter-tab ${orderFilter === f.key ? 'active' : ''}`}
                    onClick={() => setOrderFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/customer/orders')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--seims-teal)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Xem tất cả →
              </button>
            </div>
          </div>

          <div className="customer-orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <div key={order.id} className="customer-order-item">
                    <div className="customer-order-info">
                      <p className="customer-order-id">#{order.id}</p>
                      <p className="customer-order-meta">
                        {(order.created_at || order.createdAt)} · {order.total_items || order.items?.length || 0} sp
                      </p>
                    </div>
                    <div className="customer-order-right">
                      <span className={`customer-badge ${badge.cls}`}>{badge.label}</span>
                      <span className="customer-order-amount">
                        {formatPrice(order.total_amount || order.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="customer-dashboard-empty">Không có đơn hàng</div>
            )}
          </div>
        </div>

        {/* Coupons / Promotions Section */}
        <div className="customer-dashboard-section">
          <div className="customer-dashboard-section-header">
            <h3 className="customer-dashboard-section-title">Mã Giảm Giá</h3>
            <span className="customer-dashboard-section-badge">{activePromotions.length}</span>
          </div>

          <div className="customer-alerts-list">
            {activePromotions.length > 0 ? (
              activePromotions.map((coupon) => (
                <div key={coupon.id} className="customer-alert-item">
                  <div className="customer-alert-info">
                    <p className="customer-alert-name" style={{ color: '#7c3aed' }}>
                      {coupon.code}
                    </p>
                    <p className="customer-alert-meta">{coupon.description}</p>
                    <p className="customer-alert-meta">
                      Đơn tối thiểu: {formatPrice(coupon.minAmount)} · HSD: {coupon.expiresAt}
                    </p>
                  </div>
                  <div className="customer-alert-right">
                    <span
                      className="customer-badge"
                      style={{
                        color: '#7c3aed',
                        background: 'rgba(139, 92, 246, 0.12)',
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {coupon.type === 'percent' ? `-${coupon.discount}%` : 'Freeship'}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(coupon.code)}
                      style={{
                        background: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Sao chép
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="customer-dashboard-empty">Không có mã giảm giá</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
