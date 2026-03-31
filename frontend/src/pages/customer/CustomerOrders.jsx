import React, { useState, useEffect } from 'react';
import { fetchCustomerOrders, cancelCustomerOrder } from '../../services/customerApi';
import './CustomerOrders.css';

const STATUS_CONFIG = {
  pending: { label: 'Đang xử lý', color: 'var(--seims-warning)', bg: 'rgba(245, 158, 11, 0.12)' },
  preparing: { label: 'Đang chuẩn bị', color: 'var(--seims-info)', bg: 'rgba(59, 130, 246, 0.12)' },
  shipped: { label: 'Đang giao', color: 'var(--seims-teal)', bg: 'rgba(15, 118, 110, 0.12)' },
  completed: { label: 'Đã hoàn thành', color: 'var(--seims-success)', bg: 'rgba(16, 185, 129, 0.12)' },
  cancelled: { label: 'Đã hủy', color: 'var(--seims-error)', bg: 'rgba(185, 28, 28, 0.12)' },
};

const TABS = ['pending', 'preparing', 'shipped', 'completed', 'cancelled'];
const TAB_LABELS = ['Đang xử lý', 'Đang chuẩn bị', 'Đang giao', 'Đã hoàn thành', 'Đã hủy'];

function OrderCard({ order, onCancel, onCancelLoading }) {
  const config = STATUS_CONFIG[order.status] || { label: order.status, color: 'var(--seims-muted)', bg: 'rgba(0,0,0,0.05)' };

  return (
    <div className="customer-product-card" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
      {/* Order Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mã đơn: {order.id}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--seims-muted)' }}>
            📅 {order.createdAt}
          </p>
        </div>
        <span style={{
          display: 'inline-block',
          padding: '0.3rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: config.bg,
          color: config.color,
          borderRadius: '999px',
        }}>
          {config.label}
        </span>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '0.75rem' }}>
        {order.items && order.items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--seims-ink)', fontWeight: '500' }}>
              {item.name} x{item.quantity}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--seims-ink)' }}>
              {((item.unitPrice || item.salePrice || 0) * item.quantity).toLocaleString()}đ
            </span>
          </div>
        ))}
      </div>

      {/* Store Info */}
      {order.storeName && (
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--seims-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          🏪 {order.storeName} {order.storeAddress && `- ${order.storeAddress}`}
        </p>
      )}

      {/* Payment Info */}
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--seims-muted)' }}>
        💳 Thanh toán: {order.paymentMethod === 'cod' ? 'Tiền mặt (COD)' : order.paymentMethod}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--seims-border)' }}>
        <div>
          {order.paymentStatus && (
            <span style={{ fontSize: '0.75rem', color: order.paymentStatus === 'paid' ? 'var(--seims-success)' : 'var(--seims-warning)' }}>
              {order.paymentStatus === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--seims-ink)' }}>
            {order.totalAmount.toLocaleString()}đ
          </span>
        </div>
      </div>

      {/* Actions */}
      {(order.status === 'pending' || order.status === 'preparing') && (
        <button
          style={{
            marginTop: '0.75rem',
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(185, 28, 28, 0.1)',
            color: 'var(--seims-error)',
            border: '1px solid rgba(185, 28, 28, 0.2)',
            borderRadius: '6px',
            cursor: onCancelLoading ? 'wait' : 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease',
            opacity: onCancelLoading ? 0.7 : 1,
          }}
          onMouseOver={e => { if (!onCancelLoading) { e.currentTarget.style.background = 'var(--seims-error)'; e.currentTarget.style.color = 'white'; } }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(185, 28, 28, 0.1)'; e.currentTarget.style.color = 'var(--seims-error)'; }}
          onClick={() => onCancel(order.orderId || order.id)}
          disabled={onCancelLoading}
        >
          ❌ Hủy đơn hàng
        </button>
      )}

      {order.status === 'completed' && (
        <button style={{
          marginTop: '0.75rem',
          width: '100%',
          padding: '0.5rem',
          background: 'rgba(15, 118, 110, 0.1)',
          color: 'var(--seims-teal)',
          border: '1px solid rgba(15, 118, 110, 0.2)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.8rem',
          transition: 'all 0.2s ease',
        }}>
          ⭐ Đánh giá đơn hàng
        </button>
      )}
    </div>
  );
}

const CustomerOrders = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCustomerOrders('all');
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      setCancellingId(orderId);
      await cancelCustomerOrder(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert(err.response?.data?.detail || 'Không thể hủy đơn hàng.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);
  const tabCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="customer-page">
      {/* Tabs */}
      <div className="customer-search-bar">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                fontWeight: activeTab === tab ? '700' : '500',
                fontSize: '0.875rem',
                color: activeTab === tab ? 'white' : 'var(--seims-ink)',
                background: activeTab === tab ? 'var(--seims-teal)' : 'transparent',
                border: activeTab === tab ? '1px solid var(--seims-teal)' : '1px solid var(--seims-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {TAB_LABELS[idx]}
              <span style={{
                fontSize: '0.7rem',
                background: activeTab === tab ? 'rgba(255,255,255,0.25)' : 'var(--seims-mint)',
                color: activeTab === tab ? 'white' : 'var(--seims-teal-dark)',
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                fontWeight: '700',
              }}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--seims-muted)' }}>
            <p>Đang tải đơn hàng...</p>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--seims-error)', gap: '0.5rem', padding: '2rem' }}>
            <p style={{ margin: 0 }}>{error}</p>
            <button onClick={loadOrders} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'var(--seims-teal)', color: 'white', border: 'none', borderRadius: '6px' }}>
              Thử lại
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--seims-muted)',
            gap: '0.5rem',
            padding: '2rem',
          }}>
            <p style={{ fontSize: '3rem', margin: 0 }}>📦</p>
            <p style={{ fontWeight: '600', margin: 0, color: 'var(--seims-ink)' }}>
              Không có đơn hàng nào
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {activeTab === 'pending' ? 'Bạn chưa có đơn hàng đang xử lý' :
               activeTab === 'preparing' ? 'Chưa có đơn hàng đang chuẩn bị' :
               activeTab === 'shipped' ? 'Chưa có đơn hàng đang giao' :
               activeTab === 'completed' ? 'Chưa có đơn hàng đã hoàn thành' :
               'Chưa có đơn hàng bị hủy'}
            </p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id || order.orderId}
                order={order}
                onCancel={handleCancel}
                onCancelLoading={cancellingId === (order.orderId || order.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
