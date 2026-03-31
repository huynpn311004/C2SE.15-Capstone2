import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCustomerProductDetail } from "../../services/customerApi";
import './CustomerHome.css';

const CART_KEY = 'seims_customer_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
      🛒 {message}
    </div>
  );
}

const CustomerProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const data = await fetchCustomerProductDetail(id);
        setProduct(data);
      } catch (err) {
        setError('Không thể tải thông tin sản phẩm.');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product);
    showToast(`"${product.name}" đã thêm vào giỏ hàng!`);
  };

  if (loading) {
    return (
      <div className="customer-page">
        <div className="customer-products-section">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--seims-muted)' }}>
            Đang tải sản phẩm...
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="customer-page">
        <div className="customer-products-section">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--seims-muted)' }}>
            {error || 'Không tìm thấy sản phẩm'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="customer-page">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--seims-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            padding: '0.5rem 0',
            marginBottom: '0.5rem'
          }}
        >
          ← Quay lại
        </button>

        {/* Product Card */}
        <div className="customer-products-section">
          <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Product Image */}
            <div style={{
              flex: '1 1 300px',
              background: '#f9fafb',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              <img 
                src={product.image_url || product.image} 
                alt={product.name} 
                style={{ maxWidth: '100%', maxHeight: '300px', mixBlendMode: 'multiply' }} 
              />
            </div>

            {/* Product Info */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span className="customer-product-shop">{product.supermarket_name || product.shop}</span>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--seims-ink)' }}>{product.name}</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                <span className="customer-price-original" style={{ fontSize: '1.1rem' }}>{(product.original_price || product.originalPrice || 0).toLocaleString()}đ</span>
                <span className="customer-price-sale" style={{ fontSize: '1.75rem' }}>{(product.sale_price || product.salePrice || 0).toLocaleString()}đ</span>
                <span className="customer-discount-badge" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}>-{product.discount || 0}%</span>
              </div>

              <div style={{
                padding: '0.875rem',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>⏰</span>
                <span style={{ fontWeight: '600', color: 'var(--seims-warning)' }}>Còn {product.days_left || product.daysLeft || 0} ngày hết hạn</span>
              </div>

              <button
                onClick={handleAddToCart}
                className="customer-add-to-cart-btn"
                style={{
                  padding: '1rem',
                  fontSize: '1rem',
                  marginTop: 'auto'
                }}
              >
                🛒 Thêm vào giỏ hàng
              </button>
            </div>
          </div>
        </div>
      </div>
      <Toast visible={toast.visible} message={toast.message} />
    </>
  );
};

export default CustomerProductDetail;
