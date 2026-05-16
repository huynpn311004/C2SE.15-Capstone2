import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerOrders, fetchCustomerDashboardSummary, fetchAvailableCoupons, fetchCustomerSetting, depositToWallet, fetchWalletHistory } from '../../services/customerApi';
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
  const [activePromotions, setActivePromotions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [walletHistory, setWalletHistory] = useState([]);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, ordersData, couponsData, fetchSettingData, historyData] = await Promise.all([
          fetchCustomerDashboardSummary().catch(() => ({
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0,
            totalSpent: 0,
          })),
          fetchCustomerOrders('all').catch(() => []),
          fetchAvailableCoupons().catch(() => []),
          fetchCustomerSetting().catch(() => ({ walletBalance: 0 })),
          fetchWalletHistory().catch(() => []),
        ]);
        setSummary(summaryData);
        setAllOrders(ordersData);
        setActivePromotions(couponsData);
        setWalletBalance(fetchSettingData.walletBalance || 0);
        setWalletHistory(historyData.slice(0, 5));
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

  const handleRecharge = async (e) => {
    e.preventDefault();
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({ visible: true, message: 'Vui lòng nhập số tiền hợp lệ.', type: 'error' });
      return;
    }

    try {
      setIsRecharging(true);
      const res = await depositToWallet(amount);
      setWalletBalance(res.newBalance);
      setToast({ visible: true, message: res.message, type: 'success' });
      setRechargeAmount('');
      setShowTopUp(false);
      setTimeout(() => setToast({ ...toast, visible: false }), 3000);
    } catch (err) {
      setToast({ visible: true, message: 'Không thể nạp tiền.', type: 'error' });
      setTimeout(() => setToast({ ...toast, visible: false }), 3000);
    } finally {
      setIsRecharging(false);
    }
  };

  const statCards = [
    {
      label: 'Tổng Đơn Hàng',
      value: summary.totalOrders,
      tone: 'default',
    },
    {
      label: 'Đang Xử Lý',
      value: summary.pendingOrders,
      tone: summary.pendingOrders > 0 ? 'warning' : 'default',
    },
    {
      label: 'Hoàn Thành',
      value: summary.completedOrders,
      tone: 'default',
    },
    {
      label: 'Tổng Chi Tiêu',
      value: formatPrice(summary.totalSpent),
      tone: 'default',
    },
    {
      label: 'Mã Giảm Giá',
      value: activePromotions.length,
      tone: activePromotions.length > 0 ? 'warning' : 'default',
    },
    {
      label: 'Số Dư Ví',
      value: formatPrice(walletBalance),
      tone: 'success',
      canTopUp: true,
      isWallet: true,
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
      {/* Stats Grid — 6 columns */}
      <div className="customer-dashboard-stats">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`customer-dashboard-stat-card ${stat.tone === 'warning' ? 'stat-warning' : ''} ${stat.tone === 'success' ? 'stat-success' : ''}`}
          >
            <div className="customer-dashboard-stat-value">
              <span className="stat-main-value">
                {stat.isWallet ? (showBalance ? stat.value : '******đ') : stat.value}
              </span>
              <div className="stat-actions">
                {stat.isWallet && (
                  <button 
                    className="customer-dashboard-eye-trigger"
                    onClick={() => setShowBalance(!showBalance)}
                    title={showBalance ? "Ẩn số dư" : "Hiện số dư"}
                  >
                    {showBalance ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                )}
                {stat.canTopUp && (
                  <button 
                    className="customer-dashboard-topup-trigger" 
                    onClick={() => setShowTopUp(true)}
                    title="Nạp tiền vào ví"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <div className="customer-dashboard-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* RECHARGE MODAL — Same as Delivery */}
      {showTopUp && (
        <div className="customer-topup-overlay" onClick={() => setShowTopUp(false)}>
          <div className="customer-topup-modal" onClick={e => e.stopPropagation()}>
            <div className="customer-topup-header">
              <h3>Nạp tiền vào ví (Demo)</h3>
              <p>Nhập số tiền bạn muốn nạp vào ví SEIMS của mình.</p>
            </div>
            <form onSubmit={handleRecharge}>
              <div className="customer-topup-input-group">
                <input
                  type="number"
                  placeholder="Nhập số tiền VNĐ..."
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  required
                  autoFocus
                />
                <span className="currency-unit">đ</span>
              </div>
              <div className="customer-topup-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowTopUp(false)} disabled={isRecharging}>Hủy</button>
                <button type="submit" className="confirm-btn" disabled={isRecharging}>
                  {isRecharging ? 'Đang nạp...' : 'Xác nhận nạp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      Đơn tối thiểu: {formatPrice(coupon.minAmount)} · HSD: {coupon.validTo}
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
                      -{coupon.discountPercent}%
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

        {/* Wallet History Section */}
        <div className="customer-dashboard-section customer-wallet-section">
          <div className="customer-dashboard-section-header">
            <h3 className="customer-dashboard-section-title">Lịch sử giao dịch ví</h3>
            <span className="customer-dashboard-section-badge">{walletHistory.length}</span>
          </div>
          <div className="customer-wallet-history-list">
            {walletHistory.length > 0 ? (
              walletHistory.map((tx) => (
                <div key={tx.id} className="customer-wallet-tx-item">
                  <div className="customer-wallet-tx-info">
                    <p className="customer-wallet-tx-desc">{tx.description || 'Giao dịch ví'}</p>
                    <p className="customer-wallet-tx-date">
                      {new Date(tx.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className={`customer-wallet-tx-amount ${['deposit', 'refund', 'reward', 'shipping_fee', 'order_payment'].includes(tx.transaction_type) ? 'tx-plus' : 'tx-minus'}`}>
                    {['deposit', 'refund', 'reward', 'shipping_fee', 'order_payment'].includes(tx.transaction_type) ? '+' : '-'}
                    {formatPrice(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="customer-dashboard-empty">Chưa có giao dịch nào</div>
            )}
          </div>
        </div>
      </div>

      {toast.visible && (
        <div className={`customer-dashboard-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
