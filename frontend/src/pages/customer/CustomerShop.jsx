import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomerProducts, fetchCustomerCategories, fetchCustomerStores, fetchCustomerSetting } from '../../services/customerApi';
import { getProductImageUrl } from '../../services/staffApi';
import { getCart, addToCart } from '../../services/cartUtils';
import './CustomerShop.css';

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div className="customer-shop-toast">
      {message}
    </div>
  );
}

const CustomerShop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const customerCoords = useRef({ lat: null, lng: null });
  const [locationReady, setLocationReady] = useState(false);

  // Bước 1: Lấy tọa độ customer trước
  useEffect(() => {
    async function loadCustomerLocation() {
      try {
        const profile = await fetchCustomerSetting();
        if (profile.latitude != null && profile.longitude != null) {
          customerCoords.current = { lat: profile.latitude, lng: profile.longitude };
          setLocationReady(true);
          return;
        }
      } catch {}
      // Fallback: thử lấy từ localStorage auth user
      try {
        const raw = localStorage.getItem('seims_auth_user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user.latitude != null && user.longitude != null) {
            customerCoords.current = { lat: user.latitude, lng: user.longitude };
          }
        }
      } catch {}
      setLocationReady(true); // ready anyway, just no coords
    }
    loadCustomerLocation();
  }, []);

  // Bước 2: Load data SAU KHI có tọa độ
  useEffect(() => {
    if (!locationReady) return;
    loadData();
  }, [selectedCategory, selectedStore, search, locationReady]);

  async function loadData() {
    try {
      setLoading(true);
      const { lat, lng } = customerCoords.current;
      const [productsData, categoriesData, storesData] = await Promise.all([
        fetchCustomerProducts({ 
          categoryId: selectedCategory || undefined, 
          storeId: selectedStore || undefined,
          search: search || undefined,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
        }),
        fetchCustomerCategories(),
        fetchCustomerStores({ latitude: lat ?? undefined, longitude: lng ?? undefined }),
      ]);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setStores(storesData || []);
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
      <div className="customer-shop-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)' }}>
          Đang tải sản phẩm...
        </div>
      </div>
    );
  }

  return (
    <div className="customer-shop-page">
      {/* Header with cart button */}
      <div className="customer-shop-header">
        <button 
          onClick={() => navigate('/customer/cart')}
          className="customer-cart-btn"
        >
          Giỏ hàng
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
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="customer-shop-select"
        >
          <option value="">Tất cả cửa hàng</option>
          {stores.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}{st.distance != null ? ` (${st.distance}km)` : ''}
            </option>
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
            <p className="customer-shop-empty-text">Không có sản phẩm nào</p>
          </div>
        ) : (
          products.map((product) => (
            <div 
              key={`${product.id}-${product.storeId}-${product.lotCode}`} 
              className="customer-shop-product-card"
              onClick={() => navigate(`/customer/product/${product.id}`)}
            >
              {/* Phần 1: Hình ảnh (fill) */}
              <div className="customer-shop-product-image-wrapper">
                <img 
                  src={getProductImageUrl(product.imageUrl) || 'https://via.placeholder.com/200'} 
                  alt={product.name}
                  className="customer-shop-product-image"
                />
              </div>
              
              {/* Phần 2: Thông tin (bên dưới) */}
              <div className="customer-shop-product-info">
                <p className="customer-shop-product-store">
                  {product.storeName || 'Cửa hàng'}
                </p>
                
                <h4 className="customer-shop-product-title">
                  {product.name}
                </h4>
                
                {/* Giá */}
                <div className="customer-shop-product-price">
                  <span className="customer-shop-sale-price">
                    {(product.salePrice || 0).toLocaleString()}đ
                  </span>
                  {product.originalPrice && product.salePrice !== product.originalPrice && (
                    <span className="customer-shop-original-price">
                      {(product.originalPrice || 0).toLocaleString()}đ
                    </span>
                  )}
                </div>
                
                {/* Discount & ngày còn lại */}
                <div className="customer-shop-product-footer">
                  {product.discount > 0 && (
                    <span className="customer-shop-discount-tag">-{product.discount}%</span>
                  )}
                  <span className="customer-shop-days-left">
                    {product.daysLeft || 0}d
                  </span>
                </div>
                
                {/* Nút thêm vào giỏ */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="customer-shop-add-btn"
                >
                  Thêm
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
