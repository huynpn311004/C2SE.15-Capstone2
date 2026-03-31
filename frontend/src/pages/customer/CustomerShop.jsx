import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerProducts, fetchCustomerCategories, fetchCustomerSupermarkets } from '../../services/customerApi';
import './CustomerHome.css';

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

const CustomerShop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supermarkets, setSupermarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupermarket, setSelectedSupermarket] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedSupermarket, search]);

  async function loadData() {
    try {
      setLoading(true);
      const [productsData, categoriesData, supermarketsData] = await Promise.all([
        fetchCustomerProducts({ 
          categoryId: selectedCategory || undefined, 
          supermarketId: selectedSupermarket || undefined,
          search: search || undefined,
        }),
        fetchCustomerCategories(),
        fetchCustomerSupermarkets(),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setSupermarkets(supermarketsData || []);
    } catch (err) {
      console.error('Failed to load shop data:', err);
    } finally {
      setLoading(false);
    }
  }

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast(`"${product.name}" đã thêm vào giỏ hàng!`);
  };

  const cart = getCart();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading && products.length === 0) {
    return (
      <div className="customer-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)' }}>
          Đang tải sản phẩm...
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      {/* Header with cart button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate('/customer/cart')}
          style={{
            position: 'relative',
            padding: '0.75rem 1.25rem',
            background: 'var(--seims-teal-dark)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          🛒 Giỏ hàng
          {cartCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '0.75rem 1rem',
            border: '1.5px solid var(--seims-border)',
            borderRadius: '8px',
            fontSize: '0.9rem',
          }}
        />

        <select
          value={selectedSupermarket}
          onChange={(e) => setSelectedSupermarket(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            border: '1.5px solid var(--seims-border)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            minWidth: '180px',
          }}
        >
          <option value="">Tất cả cửa hàng</option>
          {supermarkets.map((sm) => (
            <option key={sm.id} value={sm.id}>{sm.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            border: '1.5px solid var(--seims-border)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            minWidth: '180px',
          }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '1rem',
        overflowY: 'auto',
        flex: 1,
      }}>
        {products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--seims-muted)' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>📦</p>
            <p style={{ fontWeight: '600', margin: 0 }}>Không có sản phẩm nào</p>
          </div>
        ) : (
          products.map((product) => (
            <div 
              key={product.id} 
              className="customer-product-card"
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/customer/product/${product.id}`)}
            >
              <div style={{ 
                height: '140px', 
                background: '#f9fafb', 
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img 
                  src={product.image_url || 'https://via.placeholder.com/120'} 
                  alt={product.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
              </div>
              
              <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--seims-muted)', margin: '0 0 0.25rem 0' }}>
                  {product.supermarket_name || 'Cửa hàng'}
                </p>
                <h4 className="customer-product-name" style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                  {product.name}
                </h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="customer-price-sale" style={{ fontSize: '1rem', fontWeight: '700' }}>
                    {(product.sale_price || 0).toLocaleString()}đ
                  </span>
                  {(product.original_price || product.originalPrice) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--seims-muted)', textDecoration: 'line-through' }}>
                      {(product.original_price || 0).toLocaleString()}đ
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  {product.discount > 0 && (
                    <span className="customer-discount-badge">-{product.discount}%</span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--seims-muted)' }}>
                    Còn {product.days_left || product.daysLeft || 0} ngày
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="customer-add-to-cart-btn"
                  style={{ marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  🛒 Thêm vào giỏ
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerShop;
