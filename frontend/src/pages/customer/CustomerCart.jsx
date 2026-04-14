import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
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
    <div className="customer-cart-toast">
      {message}
    </div>
  );
}

const CustomerCart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [cartInitialized, setCartInitialized] = useState(false);

  useEffect(() => {
    const stored = getCart();
    setCart(stored);
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

  const subtotal = cart.reduce((sum, item) => {
    const price = item.salePrice || item.bestPrice || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = cart.reduce((sum, item) => {
    const original = item.originalPrice || 0;
    const sale = item.salePrice || item.bestPrice || 0;
    return sum + (original - sale) * item.quantity;
  }, 0);

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
      <div className="customer-cart-layout">
        {/* Cart Items */}
        <div className="customer-products-section customer-cart-items-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Danh sách sản phẩm</h3>
              <p className="customer-section-subtitle">{cart.length} sản phẩm trong giỏ hàng</p>
            </div>
            {cart.length > 0 && (
              <button className="customer-cart-clear-btn" onClick={handleClearCart}>
                🗑 Xóa tất cả
              </button>
            )}
          </div>

          <div className="customer-cart-content">
            {cart.length === 0 ? (
              <div className="customer-cart-empty">
                <p className="customer-cart-empty-title">Giỏ hàng trống</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="customer-cart-item">
                  <div className="customer-cart-item-image">
                    <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                  </div>
                  <div className="customer-cart-item-info">
                    <h4 className="customer-cart-item-name">{item.name}</h4>
                    <p className="customer-cart-item-store">Cửa hàng: {item.storeName || item.shop || 'Cửa hàng'}</p>
                    <div className="customer-cart-item-meta">
                      <span className="customer-discount-badge">-{item.discount || 0}%</span>
                      <span className="customer-days-left">Còn {item.daysLeft || 0} ngày</span>
                    </div>
                  </div>
                  <div className="customer-cart-item-price">
                    <p className="customer-cart-item-price-value">
                      {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                    </p>
                    <p className="customer-cart-item-price-qty">x{item.quantity}</p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="customer-cart-item-remove"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="customer-products-section customer-cart-summary-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Tóm tắt đơn hàng</h3>
            </div>
          </div>

          <div className="customer-cart-content">
            {cart.length > 0 && cart.map(item => (
              <div key={item.id} className="customer-cart-summary-row">
                <span className="customer-cart-summary-label">{item.name} x{item.quantity}</span>
                <span className="customer-cart-summary-value">
                  {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                </span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--seims-border)', margin: '0.75rem 0' }} />

            <div className="customer-cart-summary-row">
              <span className="customer-cart-summary-label">Tạm tính</span>
              <span className="customer-cart-summary-value">{subtotal.toLocaleString()}đ</span>
            </div>
            <div className="customer-cart-summary-row">
              <span className="customer-cart-summary-label">Phí vận chuyển</span>
              <span className="customer-cart-summary-value" style={{ color: 'var(--seims-success)' }}>Miễn phí</span>
            </div>
            <div className="customer-cart-summary-savings">
              <span className="customer-cart-summary-label">Tiết kiệm</span>
              <span className="customer-cart-summary-value" style={{ color: 'var(--seims-warning)' }}>
                -{totalSavings.toLocaleString()}đ
              </span>
            </div>

            <div className="customer-cart-grand-total">
              <span className="customer-cart-grand-total-label">Tổng thanh toán</span>
              <span className="customer-cart-grand-total-value">{subtotal.toLocaleString()}đ</span>
            </div>

            <button
              onClick={() => navigate('/customer/checkout')}
              className="customer-add-to-cart-btn"
              style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '1rem' }}
              disabled={cart.length === 0}
            >
              Thanh toán ngay
            </button>

            <button
              onClick={() => navigate('/customer/home')}
              className="customer-filter-btn"
              style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerCart;
