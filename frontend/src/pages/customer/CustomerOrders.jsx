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
    <div className="order-card">
      {/* Order Header */}
      <div className="order-card-header">
        <div>
          <p className="order-card-id">Mã đơn: {order.id}</p>
          <p className="order-card-date">📅 {order.createdAt}</p>
        </div>
        <span className="order-card-status" style={{ background: config.bg, color: config.color }}>
          {config.label}
        </span>
      </div>

      {/* Items */}
      <div className="order-card-items">
        {order.items && order.items.map((item, idx) => (
          <div key={idx} className="order-card-item-row">
            <span className="order-card-item-name">{item.name} x{item.quantity}</span>
            <span className="order-card-item-price">
              {((item.unitPrice || item.salePrice || 0) * item.quantity).toLocaleString()}đ
            </span>
          </div>
        ))}
      </div>

      {/* Store Info */}
      {order.storeName && (
        <p className="order-card-store">🏪 {order.storeName} {order.storeAddress && `- ${order.storeAddress}`}</p>
      )}

      {/* Payment Info */}
      <p className="order-card-payment">💳 Thanh toán: {order.paymentMethod === 'cod' ? 'Tiền mặt (COD)' : order.paymentMethod}</p>

      {/* Footer */}
      <div className="order-card-footer">
        <div>
          {order.paymentStatus && (
            <span className="order-card-payment-status" style={{ color: order.paymentStatus === 'paid' ? 'var(--seims-success)' : 'var(--seims-warning)' }}>
              {order.paymentStatus === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
          )}
        </div>
        <div className="order-card-total">
          <span className="order-card-total-value">{order.totalAmount.toLocaleString()}đ</span>
        </div>
      </div>

      {/* Actions */}
      {(order.status === 'pending' || order.status === 'preparing') && (
        <button
          className="order-card-cancel-btn"
          onClick={() => onCancel(order.orderId || order.id)}
          disabled={onCancelLoading}
        >
          ❌ Hủy đơn hàng
        </button>
      )}

      {order.status === 'completed' && (
        <button className="order-card-review-btn">
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
        <div className="order-tabs">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`order-tab ${activeTab === tab ? 'active' : ''}`}
            >
              {TAB_LABELS[idx]}
              <span className="order-tab-count">{tabCounts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="order-list-container">
        {loading ? (
          <div className="order-loading">
            <p>Đang tải đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="order-error">
            <p>{error}</p>
            <button onClick={loadOrders} className="order-retry-btn">Thử lại</button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="order-empty">
            <p className="order-empty-icon">📦</p>
            <p className="order-empty-title">Không có đơn hàng nào</p>
            <p className="order-empty-text">
              {activeTab === 'pending' ? 'Bạn chưa có đơn hàng đang xử lý' :
               activeTab === 'preparing' ? 'Chưa có đơn hàng đang chuẩn bị' :
               activeTab === 'shipped' ? 'Chưa có đơn hàng đang giao' :
               activeTab === 'completed' ? 'Chưa có đơn hàng đã hoàn thành' :
               'Chưa có đơn hàng bị hủy'}
            </p>
          </div>
        ) : (
          <div className="order-list">
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
