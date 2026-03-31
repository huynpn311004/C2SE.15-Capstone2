import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomerOrder } from '../../services/customerApi';
import './CustomerHome.css';

const CART_KEY = 'seims_customer_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'var(--seims-teal-dark)',
      color: 'white',
      padding: '1.25rem 2rem',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '1rem',
      boxShadow: '0 8px 32px rgba(15, 118, 110, 0.4)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      animation: 'fadeInToast 0.3s ease',
      textAlign: 'center',
      maxWidth: '300px',
    }}>
      <style>{`
        @keyframes fadeInToast {
          from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: '2rem' }}>✅</span>
      {message}
    </div>
  );
}

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const getProfile = () => {
    try {
      const authRaw = localStorage.getItem('seims_auth_user');
      const authUser = authRaw ? JSON.parse(authRaw) : null;
      return authUser || {};
    } catch { return {}; }
  };

  const profile = getProfile();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
  });

  useEffect(() => {
    const storedCart = getCart();
    setCart(storedCart);

    if (profile.full_name || profile.fullName) setFormData(prev => ({ ...prev, name: profile.full_name || profile.fullName }));
    if (profile.phone) setFormData(prev => ({ ...prev, phone: profile.phone }));

    setLoading(false);
  }, []);

  const subtotal = cart.reduce((sum, item) => {
    const price = item.sale_price || item.salePrice || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = cart.reduce((sum, item) => {
    const original = item.original_price || item.originalPrice || 0;
    const sale = item.sale_price || item.salePrice || 0;
    return sum + (original - sale) * item.quantity;
  }, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      setToast({ visible: true, message: 'Giỏ hàng trống! Vui lòng thêm sản phẩm.' });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return;
    }

    try {
      setSubmitting(true);

      const items = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        lotCode: item.lotCode || null,
      }));

      const storeId = cart[0].storeId || cart[0].store_id || null;

      const result = await createCustomerOrder({
        items,
        storeId,
        paymentMethod: 'cod',
      });

      clearCart();

      setToast({ visible: true, message: `Đặt hàng thành công!\nMã đơn: ${result.orderCode || result.orderId}` });
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        navigate('/customer/orders');
      }, 2500);
    } catch (err) {
      console.error('Failed to create order:', err);
      setToast({ visible: true, message: err.response?.data?.detail || 'Đặt hàng thất bại. Vui lòng thử lại.' });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)', padding: '2rem' }}>
          Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      {/* Welcome Header */}
      <div className="customer-welcome">
        <div>
          <h2>Thông tin giao hàng</h2>
          <p>Vui lòng điền đầy đủ thông tin</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Form Section */}
        <div className="customer-products-section" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Thông tin giao hàng</h3>
              <p className="customer-section-subtitle">Vui lòng điền đầy đủ thông tin</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                👤 Họ và tên *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="customer-search-input"
                placeholder="Nhập họ và tên của bạn"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📞 Số điện thoại *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="customer-search-input"
                placeholder="0901 234 567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📍 Địa chỉ giao hàng *
              </label>
              <textarea
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="customer-search-input"
                rows="3"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                style={{ resize: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📝 Ghi chú (tùy chọn)
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="customer-search-input"
                rows="3"
                placeholder="Thời gian nhận hàng, yêu cầu đặc biệt..."
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', margin: 0 }}>💡 Lưu ý:</p>
              <ul style={{ fontSize: '0.8rem', color: 'var(--seims-muted)', margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>
                <li>Thời gian giao hàng dự kiến: 30-60 phút</li>
                <li>Miễn phí vận chuyển cho đơn hàng cận hạn</li>
              </ul>
            </div>

            <button
              type="submit"
              className="customer-add-to-cart-btn"
              style={{ padding: '0.875rem', fontSize: '1rem' }}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? '⏳ Đang xử lý...' : '💳 Xác nhận đặt hàng'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="customer-products-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Đơn hàng của bạn</h3>
              <p className="customer-section-subtitle">{cart.length} sản phẩm</p>
            </div>
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--seims-muted)' }}>
                <p style={{ margin: 0 }}>Giỏ hàng trống</p>
                <button
                  onClick={() => navigate('/customer/home')}
                  className="customer-filter-btn"
                  style={{ marginTop: '0.75rem' }}
                >
                  ← Quay lại trang chủ
                </button>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--seims-border)', marginBottom: '1rem' }}>
                    <div style={{ width: '60px', height: '60px', background: '#f9fafb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={item.image_url || item.image} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '600', color: 'var(--seims-ink)', fontSize: '0.85rem' }}>{item.name}</p>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--seims-muted)' }}>Cửa hàng: {item.storeName || item.shop || 'Cửa hàng'}</p>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--seims-muted)' }}>Số lượng: x{item.quantity}</p>
                      {item.discount > 0 && (
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--seims-warning)', fontWeight: '600' }}>🏷 Giảm {item.discount}%</p>
                      )}
                    </div>
                    <p style={{ fontWeight: '700', color: 'var(--seims-teal-dark)', fontSize: '0.9rem', margin: 0, flexShrink: 0 }}>
                      {((item.sale_price || item.salePrice || 0) * item.quantity).toLocaleString()}đ
                    </p>
                  </div>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--seims-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--seims-muted)', fontWeight: '500' }}>Tạm tính</span>
                    <span style={{ fontWeight: '600' }}>{subtotal.toLocaleString()}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--seims-muted)', fontWeight: '500' }}>Phí vận chuyển</span>
                    <span style={{ fontWeight: '600', color: 'var(--seims-success)' }}>🚚 Miễn phí</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--seims-muted)', fontWeight: '500' }}>Tiết kiệm</span>
                    <span style={{ fontWeight: '600', color: 'var(--seims-warning)' }}>-{totalSavings.toLocaleString()}đ</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>Tổng thanh toán</span>
                  <span style={{ fontWeight: '800', fontSize: '1.75rem', color: 'var(--seims-teal-dark)' }}>{subtotal.toLocaleString()}đ</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--seims-muted)', marginTop: '1rem' }}>
                  <span style={{ color: 'var(--seims-success)' }}>✅</span>
                  <span>Giao dịch an toàn & bảo mật</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerCheckout;
