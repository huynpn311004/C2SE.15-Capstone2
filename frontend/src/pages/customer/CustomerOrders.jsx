import React, { useState, useEffect } from 'react';
import './CustomerDashboard.css';

const ORDERS_KEY = 'seims_customer_orders';

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
    // Seed with sample orders
    const sampleOrders = [
      {
        id: 'ORD-2026-001',
        items: [
          { name: 'Sua tuoi Vinamilk 1L', shop: 'VinMart', quantity: 1, salePrice: 15000 },
          { name: 'Banh mi sandwich', shop: 'Circle K', quantity: 2, salePrice: 12000 },
        ],
        status: 'processing',
        total: 39000,
        savings: 26000,
        date: '2026-03-27 10:30',
        address: '123 Đường ABC, Quận 1, TP.HCM',
      },
      {
        id: 'ORD-2026-002',
        items: [
          { name: 'Yaourt Vinamilk 4 hop', shop: 'Coopmart', quantity: 1, salePrice: 18000 },
        ],
        status: 'completed',
        total: 18000,
        savings: 12000,
        date: '2026-03-25 14:00',
        address: '456 Đường XYZ, Quận 3, TP.HCM',
      },
      {
        id: 'ORD-2026-003',
        items: [
          { name: 'Banh quy Cosy goi 200g', shop: 'VinMart', quantity: 1, salePrice: 21000 },
        ],
        status: 'cancelled',
        total: 21000,
        savings: 14000,
        date: '2026-03-24 09:15',
        address: '789 Đường DEF, Quận 5, TP.HCM',
      },
    ];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(sampleOrders));
    return sampleOrders;
  } catch { return []; }
}

const STATUS_CONFIG = {
  processing: { label: 'Đang xử lý', color: 'var(--seims-warning)', bg: 'rgba(245, 158, 11, 0.12)' },
  completed: { label: 'Đã hoàn thành', color: 'var(--seims-success)', bg: 'rgba(16, 185, 129, 0.12)' },
  cancelled: { label: 'Đã hủy', color: 'var(--seims-error)', bg: 'rgba(185, 28, 28, 0.12)' },
};

const TABS = ['processing', 'completed', 'cancelled'];
const TAB_LABELS = ['Đang xử lý', 'Đã hoàn thành', 'Đã hủy'];

function OrderCard({ order }) {
  const config = STATUS_CONFIG[order.status];

  return (
    <div className="customer-product-card" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
      {/* Order Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mã đơn: {order.id}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--seims-muted)' }}>
            📅 {order.date}
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
        {order.items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--seims-ink)', fontWeight: '500' }}>
              {item.name} x{item.quantity}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--seims-ink)' }}>
              {(item.salePrice * item.quantity).toLocaleString()}đ
            </span>
          </div>
        ))}
      </div>

      {/* Address */}
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', color: 'var(--seims-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        📍 {order.address}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--seims-border)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--seims-muted)' }}>Tiết kiệm </span>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--seims-warning)' }}>
            -{order.savings.toLocaleString()}đ
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--seims-ink)' }}>
            {order.total.toLocaleString()}đ
          </span>
        </div>
      </div>

      {/* Actions */}
      {order.status === 'processing' && (
        <button style={{
          marginTop: '0.75rem',
          width: '100%',
          padding: '0.5rem',
          background: 'rgba(185, 28, 28, 0.1)',
          color: 'var(--seims-error)',
          border: '1px solid rgba(185, 28, 28, 0.2)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.8rem',
          transition: 'all 0.2s ease',
        }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--seims-error)'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(185, 28, 28, 0.1)'; e.currentTarget.style.color = 'var(--seims-error)'; }}
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
  const [activeTab, setActiveTab] = useState('processing');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    setOrders(getOrders());

    const handleUpdate = () => setOrders(getOrders());
    window.addEventListener('seims-orders-updated', handleUpdate);
    return () => window.removeEventListener('seims-orders-updated', handleUpdate);
  }, []);

  const filteredOrders = orders.filter(o => o.status === activeTab);
  const tabCounts = {
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <div className="customer-page">
      {/* Welcome Header */}
      <div className="customer-welcome">
        <div>
          <h2>Đơn hàng của bạn</h2>
          <p>Theo dõi trạng thái đơn hàng</p>
        </div>
      </div>

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
        {filteredOrders.length === 0 ? (
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
              {activeTab === 'processing' ? 'Bạn chưa có đơn hàng đang xử lý' :
               activeTab === 'completed' ? 'Chưa có đơn hàng đã hoàn thành' :
               'Chưa có đơn hàng bị hủy'}
            </p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;
