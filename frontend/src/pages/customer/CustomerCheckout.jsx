import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomerOrder } from '../../services/customerApi';
import { getProductImageUrl } from '../../services/staffApi';
import './CustomerCheckout.css';

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
    <div className="customer-toast-center">
      <span className="customer-toast-icon">&#10004;</span>
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
    const price = item.salePrice || item.bestPrice || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = cart.reduce((sum, item) => {
    const original = item.originalPrice || 0;
    const sale = item.salePrice || item.bestPrice || 0;
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
      <div className="customer-checkout-welcome">
        <div>
          <h2>Thông tin giao hàng</h2>
          <p>Vui lòng điền đầy đủ thông tin</p>
        </div>
      </div>

      <div className="customer-checkout-layout">
        {/* Form Section */}
        <div className="customer-products-section customer-checkout-form-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Thông tin giao hàng</h3>
              <p className="customer-section-subtitle">Vui lòng điền đầy đủ thông tin</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="customer-checkout-form">
            <div>
              <label className="customer-checkout-field">
                &#128100; Họ và tên *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="customer-checkout-input"
                placeholder="Nhập họ và tên của bạn"
              />
            </div>

            <div>
              <label className="customer-checkout-field">
                &#128242; Số điện thoại *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="customer-checkout-input"
                placeholder="0901 234 567"
              />
            </div>

            <div>
              <label className="customer-checkout-field">
                &#128205; Địa chỉ giao hàng *
              </label>
              <textarea
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="customer-checkout-textarea"
                rows="3"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              />
            </div>

            <div>
              <label className="customer-checkout-field">
                &#128221; Ghi chú (tùy chọn)
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="customer-checkout-textarea"
                rows="3"
                placeholder="Thời gian nhận hàng, yêu cầu đặc biệt..."
              />
            </div>

            <div className="customer-checkout-note">
              <p className="customer-checkout-note-title">&#128161; Lưu ý:</p>
              <ul className="customer-checkout-note-list">
                <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>
                <li>Thời gian giao hàng dự kiến: 30-60 phút</li>
                <li>Miễn phí vận chuyển cho đơn hàng cận hạn</li>
              </ul>
            </div>

            <button
              type="submit"
              className="customer-checkout-submit"
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? '&#8987; Đang xử lý...' : '&#128179; Xác nhận đặt hàng'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="customer-products-section customer-checkout-summary-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Đơn hàng của bạn</h3>
              <p className="customer-section-subtitle">{cart.length} sản phẩm</p>
            </div>
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {cart.length === 0 ? (
              <div className="customer-checkout-empty">
                <p>Giỏ hàng trống</p>
                <button
                  onClick={() => navigate('/customer/home')}
                  className="customer-checkout-empty-btn"
                >
                  &#8592; Quay lại trang chủ
                </button>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} className="customer-checkout-item">
                    <div className="customer-checkout-item-image">
                      <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                    </div>
                    <div className="customer-checkout-item-info">
                      <p className="customer-checkout-item-name">{item.name}</p>
                      <p className="customer-checkout-item-store">Cửa hàng: {item.storeName || item.shop || 'Cửa hàng'}</p>
                      <p className="customer-checkout-item-qty">Số lượng: x{item.quantity}</p>
                      {item.discount > 0 && (
                        <p className="customer-checkout-item-discount">&#128992; Giảm {item.discount}%</p>
                      )}
                    </div>
                    <p className="customer-checkout-item-price">
                      {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                    </p>
                  </div>
                ))}

                <div className="customer-checkout-totals">
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Tạm tính</span>
                    <span className="customer-checkout-totals-value">{subtotal.toLocaleString()}đ</span>
                  </div>
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Phí vận chuyển</span>
                    <span className="customer-checkout-totals-value" style={{ color: 'var(--seims-success)' }}>&#128667; Miễn phí</span>
                  </div>
                  <div className="customer-checkout-savings">
                    <span className="customer-checkout-totals-label">Tiết kiệm</span>
                    <span className="customer-checkout-totals-value" style={{ color: 'var(--seims-warning)' }}>-{totalSavings.toLocaleString()}đ</span>
                  </div>
                </div>

                <div className="customer-checkout-grand-total">
                  <span className="customer-checkout-grand-total-label">Tổng thanh toán</span>
                  <span className="customer-checkout-grand-total-value">{subtotal.toLocaleString()}đ</span>
                </div>

                <div className="customer-checkout-secure">
                  <span style={{ color: 'var(--seims-success)' }}>&#10004;</span>
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
