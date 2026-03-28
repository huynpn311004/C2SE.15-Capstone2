import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProducts } from '../../services/mockProducts';
import './CustomerCart.css';

const CART_KEY = 'seims_customer_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart(cart);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      background: 'var(--seims-teal-dark)',
      color: 'white',
      padding: '0.75rem 1.25rem',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '0.875rem',
      boxShadow: '0 4px 16px rgba(15, 118, 110, 0.3)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      animation: 'slideInToast 0.3s ease',
    }}>
      <style>{`
        @keyframes slideInToast {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      ✅ {message}
    </div>
  );
}

const CustomerCart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [cartInitialized, setCartInitialized] = useState(false);

  // Initialize cart from localStorage on mount
  useEffect(() => {
    const stored = getCart();
    // Seed cart with a sample product if empty
    if (stored.length === 0) {
      const sampleProduct = mockProducts[0];
      const initialCart = [{ ...sampleProduct, quantity: 1 }];
      saveCart(initialCart);
      setCart(initialCart);
    } else {
      setCart(stored);
    }
    setCartInitialized(true);

    const handleUpdate = () => setCart(getCart());
    window.addEventListener('seims-cart-updated', handleUpdate);
    return () => window.removeEventListener('seims-cart-updated', handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
    showToast('Đã xóa sản phẩm khỏi giỏ hàng');
  };

  const handleClearCart = () => {
    clearCart();
    setCart([]);
    showToast('Đã xóa toàn bộ giỏ hàng');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const totalSavings = cart.reduce((sum, item) => sum + (item.originalPrice - item.salePrice) * item.quantity, 0);

  if (!cartInitialized) {
    return (
      <div className="customer-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)', padding: '2rem' }}>
          Đang tải giỏ hàng...
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Cart Items */}
        <div className="customer-products-section" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Danh sách sản phẩm</h3>
              <p className="customer-section-subtitle">{cart.length} sản phẩm trong giỏ hàng</p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--seims-error)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline',
                }}
              >
                🗑 Xóa tất cả
              </button>
            )}
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--seims-muted)' }}>
                <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🛒</p>
                <p style={{ fontWeight: '600', margin: '0 0 0.5rem 0', color: 'var(--seims-ink)' }}>Giỏ hàng trống</p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Hãy thêm sản phẩm từ trang chủ</p>
                <button
                  onClick={() => navigate('/customer/home')}
                  className="customer-add-to-cart-btn"
                  style={{ marginTop: '1rem', maxWidth: '200px' }}
                >
                  Khám phá sản phẩm
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="customer-product-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '80px', height: '80px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 className="customer-product-name">{item.name}</h4>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: 'var(--seims-muted)' }}>Cửa hàng: {item.shop}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span className="customer-discount-badge">-{item.discount}%</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--seims-muted)' }}>Còn {item.daysLeft} ngày</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <span className="customer-price-sale" style={{ fontSize: '1rem' }}>{(item.salePrice * item.quantity).toLocaleString()}đ</span>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--seims-muted)' }}>x{item.quantity}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    style={{
                      padding: '0.5rem',
                      background: 'rgba(185, 28, 28, 0.1)',
                      border: '1px solid rgba(185, 28, 28, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: 'var(--seims-error)',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="customer-products-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Tóm tắt đơn hàng</h3>
            </div>
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto' }}>
            {cart.length > 0 && cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--seims-muted)', flex: 1 }}>{item.name} x{item.quantity}</span>
                <span style={{ fontWeight: '600', marginLeft: '0.5rem' }}>{(item.salePrice * item.quantity).toLocaleString()}đ</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--seims-border)', margin: '0.75rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--seims-muted)', fontSize: '0.85rem' }}>Tạm tính</span>
              <span style={{ fontWeight: '600' }}>{subtotal.toLocaleString()}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--seims-muted)', fontSize: '0.85rem' }}>Phí vận chuyển</span>
              <span style={{ fontWeight: '600', color: 'var(--seims-success)' }}>Miễn phí</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--seims-muted)', fontSize: '0.85rem' }}>Tiết kiệm</span>
              <span style={{ fontWeight: '600', color: 'var(--seims-warning)' }}>-{totalSavings.toLocaleString()}đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed var(--seims-border)' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>Tổng thanh toán</span>
              <span style={{ fontWeight: '800', fontSize: '1.5rem', color: 'var(--seims-teal-dark)' }}>{subtotal.toLocaleString()}đ</span>
            </div>

            <button
              onClick={() => navigate('/customer/checkout')}
              className="customer-add-to-cart-btn"
              style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '1rem' }}
              disabled={cart.length === 0}
            >
              💳 Thanh toán ngay
            </button>

            <button
              onClick={() => navigate('/customer/home')}
              className="customer-filter-btn"
              style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              ← Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerCart;
