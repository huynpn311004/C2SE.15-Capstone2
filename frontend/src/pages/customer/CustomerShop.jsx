import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerProducts, fetchCustomerCategories, fetchCustomerSupermarkets } from '../../services/customerApi';
import './CustomerShop.css';

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
    <div className="customer-shop-toast">
      &#10003; {message}
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
      <div className="customer-shop-header">
        <button 
          onClick={() => navigate('/customer/cart')}
          className="customer-cart-btn"
        >
          &#128722; Giỏ hàng
          {cartCount > 0 && (
            <span className="customer-cart-badge">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="customer-shop-filters">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="customer-shop-search"
        />

        <select
          value={selectedSupermarket}
          onChange={(e) => setSelectedSupermarket(e.target.value)}
          className="customer-shop-select"
        >
          <option value="">Tất cả cửa hàng</option>
          {supermarkets.map((sm) => (
            <option key={sm.id} value={sm.id}>{sm.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="customer-shop-select"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div className="customer-shop-grid">
        {products.length === 0 ? (
          <div className="customer-shop-empty">
            <p className="customer-shop-empty-icon">&#128230;</p>
            <p className="customer-shop-empty-text">Không có sản phẩm nào</p>
          </div>
        ) : (
          products.map((product) => (
            <div 
              key={product.id} 
              className="customer-product-card"
              onClick={() => navigate(`/customer/product/${product.id}`)}
            >
              <div className="customer-product-image">
                <img 
                  src={product.imageUrl || 'https://via.placeholder.com/120'} 
                  alt={product.name}
                />
              </div>
              
              <div className="customer-product-content">
                <p className="customer-product-shop">
                  {product.storeName || 'Cửa hàng'}
                </p>
                <h4 className="customer-product-name">
                  {product.name}
                </h4>
                
                <div className="customer-product-price-row">
                  <span className="customer-price-sale">
                    {(product.salePrice || 0).toLocaleString()}đ
                  </span>
                  {product.originalPrice && (
                    <span className="customer-price-original">
                      {(product.originalPrice || 0).toLocaleString()}đ
                    </span>
                  )}
                </div>

                <div className="customer-product-meta">
                  {product.discount > 0 && (
                    <span className="customer-discount-badge">-{product.discount}%</span>
                  )}
                  <span className="customer-days-left">
                    Còn {product.daysLeft || 0} ngày
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="customer-add-to-cart-btn"
                >
                  &#128722; Thêm vào giỏ
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
