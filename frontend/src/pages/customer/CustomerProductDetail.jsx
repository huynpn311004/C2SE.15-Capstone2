import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCustomerProductDetail, validateCartStock } from "../../services/customerApi";
import { getProductImageUrl } from "../../services/staffApi";
import './CustomerProductDetail.css';

const CART_KEY = 'seims_customer_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToCart(product) {
  const cart = getCart();
  // Find existing item with same id AND same storeId (same lotCode)
  const existing = cart.find(item =>
    item.id === product.id &&
    (item.storeId || item.store_id) === (product.storeId || product.store_id) &&
    (item.lotCode || item.lot_code) === (product.lotCode || product.lot_code)
  );
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
    <div className="customer-product-detail-toast">
      &#128722; {message}
    </div>
  );
}

const CustomerProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
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

  const handleAddToCart = async () => {
    if (!product || addingToCart) return;
    
    try {
      setAddingToCart(true);
      
      // Validate stock before adding to cart
      const storeId = product.stores?.[0]?.storeId || product.storeId;
      if (!storeId) {
        showToast('Không xác định được cửa hàng');
        return;
      }
      
      const validation = await validateCartStock([{
        productId: product.id,
        quantity: 1,
        storeId: storeId
      }]);
      
      if (!validation.valid) {
        const outOfStock = validation.outOfStockItems.join(', ');
        showToast(`⚠️ ${outOfStock}`);
        return;
      }
      
      // Check if requested quantity exceeds available
      const itemValidation = validation.items[0];
      if (!itemValidation.enoughStock) {
        showToast(` Sản phẩm chỉ còn ${itemValidation.availableQuantity} trong kho`);
        return;
      }
      
      // Stock OK - add to cart
      addToCart(product);
      showToast(`"${product.name}" đã thêm vào giỏ hàng!`);
    } catch (err) {
      console.error('Failed to validate cart:', err);
      // If validation fails, still allow adding (graceful degradation)
      addToCart(product);
      showToast(`"${product.name}" đã thêm vào giỏ hàng!`);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-product-page">
        <div className="customer-product-card-wrapper">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--seims-muted)' }}>
            Đang tải sản phẩm...
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="customer-product-page">
        <div className="customer-product-card-wrapper">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--seims-muted)' }}>
            {error || 'Không tìm thấy sản phẩm'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-product-page">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="customer-product-detail-back"
        >
          Quay lại
        </button>

        {/* Product Card */}
        <div className="customer-product-card-wrapper">
            {/* Product Image */}
            <div className="customer-product-detail-image">
              <img 
                src={getProductImageUrl(product.imageUrl || product.image)} 
                alt={product.name}
              />
            </div>

            {/* Product Info */}
            <div className="customer-product-detail-info">
              <span className="customer-product-detail-shop">
                {product.supermarketName || product.shop || 'Siêu thị'}
              </span>
              <h1 className="customer-product-detail-name">{product.name}</h1>

              <div className="customer-product-detail-pricing">
                <span className="customer-product-detail-original">
                  {(product.originalPrice || 0).toLocaleString()}đ
                </span>
                <span className="customer-product-detail-sale">
                  {(product.bestPrice || product.salePrice || 0).toLocaleString()}đ
                </span>
                <span className="customer-discount-badge">
                  -{product.bestDiscount || product.discount || 0}%
                </span>
              </div>

              <div className="customer-product-detail-expiry">
                <span style={{ fontSize: '1.25rem' }}>&#9200;</span>
                <span>Còn {product.daysLeft || product.stores?.[0]?.daysLeft || 0} ngày hết hạn</span>
              </div>

              <button
                onClick={handleAddToCart}
                className="customer-product-detail-add-btn"
                disabled={addingToCart || loading}
              >
                Thêm vào giỏ hàng
              </button>
            </div>
      </div>
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerProductDetail;
