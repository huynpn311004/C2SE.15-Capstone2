import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
import { fetchCustomerProductDetail, createMultiStoreOrder } from '../../services/customerApi';
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
  const location = useLocation();

  // Get multi-store order info from Cart
  const orderGroups = location.state?.orderGroups || [];
  const cartItems = location.state?.cartItems || [];
  const itemsForOrder = location.state?.itemsForOrder || [];  // NEW: Items that need order creation
  const isMultiStore = location.state?.isMultiStore || false;
  const totalOrders = location.state?.totalOrders || 1;
  const totalAmount = location.state?.totalAmount || 0;

  // Legacy single order support
  const reservedOrderId = location.state?.orderId;
  const reservedOrderCode = location.state?.orderCode;
  const isReserved = location.state?.isReserved || false;

  const [cart, setCart] = useState(cartItems.length > 0 ? cartItems : []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isAddressModified, setIsAddressModified] = useState(false);

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

  const [originalAddress, setOriginalAddress] = useState('');

  useEffect(() => {
    async function loadCartWithFreshPrices() {
      const storedCart = cartItems.length > 0 ? cartItems : getCart();

      // For multi-store orders, server calculates the final prices
      // For legacy single orders, we need to refresh prices from server
      if (!isMultiStore && storedCart.length > 0) {
        const productIds = [...new Set(storedCart.map(item => item.id))];
        const freshPricesMap = {};

        try {
          // Fetch fresh prices for all products in parallel
          const fetchPromises = productIds.map(id => fetchCustomerProductDetail(id).catch(() => null));
          const results = await Promise.all(fetchPromises);

          results.forEach(productDetail => {
            if (productDetail) {
              freshPricesMap[productDetail.id] = {
                salePrice: productDetail.bestPrice || productDetail.salePrice,
                originalPrice: productDetail.originalPrice,
                discount: productDetail.bestDiscount || productDetail.discount,
              };
            }
          });
        } catch (err) {
          console.warn('Failed to fetch fresh prices, using cached prices');
        }

        // Merge fresh prices with cart items
        const updatedCart = storedCart.map(item => {
          const fresh = freshPricesMap[item.id];
          if (fresh) {
            return {
              ...item,
              salePrice: fresh.salePrice,
              originalPrice: fresh.originalPrice,
              discount: fresh.discount,
            };
          }
          return item;
        });

        setCart(updatedCart);
      } else {
        setCart(storedCart);
      }

      const initialName = profile.full_name || profile.fullName || '';
      const initialPhone = profile.phone || '';
      const initialAddress = profile.address || '';

      setFormData(prev => ({
        ...prev,
        name: initialName,
        phone: initialPhone,
        address: initialAddress
      }));

      setOriginalAddress(initialAddress);
      setLoading(false);
    }

    loadCartWithFreshPrices();
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
    
    // Detect address change
    if (name === 'address') {
      setIsAddressModified(value !== originalAddress);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) {
      setToast({ visible: true, message: 'Giỏ hàng trống! Vui lòng thêm sản phẩm.' });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return;
    }

    try {
      setSubmitting(true);

      // NEW FLOW: Create orders from cart items with user-entered address
      if (isMultiStore && itemsForOrder.length > 0) {
        // Validate address is provided
        if (!formData.address || formData.address.trim() === '') {
          setToast({ visible: true, message: '⚠️ Vui lòng nhập địa chỉ giao hàng!' });
          setSubmitting(false);
          return;
        }

        // Create multi-store orders with address from form
        const result = await createMultiStoreOrder({
          items: itemsForOrder,
          paymentMethod: 'cod',
          shippingAddress: formData.address,  // ✅ Using user-entered address
        });

        // Update localStorage with new address
        const authRaw = localStorage.getItem('seims_auth_user');
        const authUser = authRaw ? JSON.parse(authRaw) : null;
        if (authUser) {
          authUser.address = formData.address;
          localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
        }

        // Format order codes
        const orderCodes = result.orderGroups.map(g => g.orderCode).join(', ');
        clearCart();
        setToast({
          visible: true,
          message: `✅ Đặt hàng thành công!\n${result.totalOrders} đơn: ${orderCodes}`
        });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/customer/orders');
        }, 3000);
        return;
      }

      // OLD FLOW: Multi-Store Orders already created (pre-created orders)
      if (isMultiStore && orderGroups.length > 0) {
        // Update address if modified
        if (isAddressModified) {
          const authRaw = localStorage.getItem('seims_auth_user');
          const authUser = authRaw ? JSON.parse(authRaw) : null;
          if (authUser) {
            authUser.address = formData.address;
            localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
          }
        }

        // Format order codes
        const orderCodes = orderGroups.map(g => g.orderCode).join(', ');
        clearCart();
        setToast({
          visible: true,
          message: `✅ Đặt hàng thành công!\n${totalOrders} đơn: ${orderCodes}`
        });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/customer/orders');
        }, 3000);
        return;
      }

      // Legacy single order support
      if (isReserved && reservedOrderId) {
        if (isAddressModified) {
          const authRaw = localStorage.getItem('seims_auth_user');
          const authUser = authRaw ? JSON.parse(authRaw) : null;
          if (authUser) {
            authUser.address = formData.address;
            localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
          }
        }

        clearCart();
        setToast({ visible: true, message: `✅ Đặt hàng thành công!\nMã đơn: ${reservedOrderCode}` });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/customer/orders');
        }, 2500);
        return;
      }

      // Fallback
      setToast({ visible: true, message: 'Vui lòng quay lại giỏ hàng và thử lại.' });
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        navigate('/customer/cart');
      }, 2500);

    } catch (err) {
      console.error('Failed:', err);
      setToast({ visible: true, message: 'Có lỗi xảy ra. Vui lòng thử lại.' });
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
      <div className="customer-checkout-layout">
        {/* Order Summary */}
        <div className="customer-products-section customer-checkout-summary-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Đơn hàng của bạn</h3>
              {isMultiStore && (orderGroups.length > 0 || cartItems.length > 0) ? (
                <>
                  <p className="customer-section-subtitle">{(orderGroups.length > 0 ? cart.length : cartItems.length)} sản phẩm</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--seims-info)', marginTop: '0.25rem' }}>
                    Từ {orderGroups.length > 0 ? orderGroups.length : Math.max(1, cartItems.length > 0 ? [...new Set(cartItems.map(i => i.storeId || i.store_id))].length : 1)} cửa hàng khác nhau
                  </p>
                </>
              ) : (
                <p className="customer-section-subtitle">{cart.length} sản phẩm</p>
              )}
              {isMultiStore && orderGroups.length > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--seims-success)', marginTop: '0.25rem' }}>
                  ✅ Đã giữ chỗ: {orderGroups.map(g => g.orderCode).join(', ')}
                </p>
              )}
              {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--seims-warning)', marginTop: '0.25rem' }}>
                  ⏳ Chưa giữ chỗ - Vui lòng điền đầy đủ thông tin để xác nhận đơn hàng
                </p>
              )}
              {!isMultiStore && isReserved && reservedOrderCode && (
                <p style={{ fontSize: '0.75rem', color: 'var(--seims-success)', marginTop: '0.25rem' }}>
                  ✅ Đã giữ chỗ: {reservedOrderCode}
                </p>
              )}
            </div>
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
            {cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0 ? (
              <div className="customer-checkout-empty">
                <p>Giỏ hàng trống</p>
                <button
                  onClick={() => navigate('/customer/home')}
                  className="customer-checkout-empty-btn"
                >
                  Quay lại trang chủ
                </button>
              </div>
            ) : (
              <>
                {/* Multi-Store Orders Display (already created) */}
                {isMultiStore && orderGroups.length > 0 && orderGroups.map((group, groupIdx) => (
                  <div key={group.orderId} className="customer-checkout-store-group">
                    {/* Store Header */}
                    <div className="customer-checkout-store-header">
                      <span className="customer-checkout-store-icon">🏪</span>
                      <div className="customer-checkout-store-info">
                        <span className="customer-checkout-store-name">{group.storeName}</span>
                        <span className="customer-checkout-store-order">{group.orderCode}</span>
                      </div>
                      <span className="customer-checkout-store-total">
                        {group.totalAmount.toLocaleString()}đ
                      </span>
                    </div>

                    {/* Items in this order */}
                    {group.items.map((item, itemIdx) => (
                      <div key={`${group.orderId}-${itemIdx}`} className="customer-checkout-item">
                        <div className="customer-checkout-item-image">
                          <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                        </div>
                        <div className="customer-checkout-item-info">
                          <p className="customer-checkout-item-name">{item.name}</p>
                          <p className="customer-checkout-item-qty">Số lượng: x{item.quantity}</p>
                        </div>
                        <p className="customer-checkout-item-price">
                          {(item.unitPrice * item.quantity).toLocaleString()}đ
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Multi-Store Items Display (new flow - not yet created) */}
                {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (
                  <>
                    {(() => {
                      // Group cart items by store for display
                      const storeGroups = {};
                      cartItems.forEach(item => {
                        const storeId = item.storeId || item.store_id;
                        if (!storeGroups[storeId]) {
                          storeGroups[storeId] = {
                            storeId,
                            storeName: item.storeName || item.shop || `Cửa hàng ${storeId}`,
                            items: []
                          };
                        }
                        storeGroups[storeId].items.push(item);
                      });
                      
                      return Object.values(storeGroups).map((group) => (
                        <div key={group.storeId} className="customer-checkout-store-group">
                          {/* Store Header */}
                          <div className="customer-checkout-store-header">
                            <span className="customer-checkout-store-icon">🏪</span>
                            <div className="customer-checkout-store-info">
                              <span className="customer-checkout-store-name">{group.storeName}</span>
                            </div>
                          </div>

                          {/* Items in this store */}
                          {group.items.map((item, itemIdx) => (
                            <div key={`${group.storeId}-${itemIdx}`} className="customer-checkout-item">
                              <div className="customer-checkout-item-image">
                                <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                              </div>
                              <div className="customer-checkout-item-info">
                                <p className="customer-checkout-item-name">{item.name}</p>
                                <p className="customer-checkout-item-qty">Số lượng: x{item.quantity}</p>
                              </div>
                              <p className="customer-checkout-item-price">
                                {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                              </p>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </>
                )}

                {/* Legacy Single Order Display */}
                {!isMultiStore && cart.map(item => (
                  <div key={item.id} className="customer-checkout-item">
                    <div className="customer-checkout-item-image">
                      <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                    </div>
                    <div className="customer-checkout-item-info">
                      <p className="customer-checkout-item-name">{item.name}</p>
                      <p className="customer-checkout-item-store">Cửa hàng: {item.storeName || item.shop || 'Cửa hàng'}</p>
                      <p className="customer-checkout-item-qty">Số lượng: x{item.quantity}</p>
                      {item.discount > 0 && (
                        <p className="customer-checkout-item-discount">Giảm {item.discount}%</p>
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
                    <span className="customer-checkout-totals-value">
                      {(isMultiStore ? totalAmount : subtotal).toLocaleString()}đ
                    </span>
                  </div>
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Phí vận chuyển</span>
                    <span className="customer-checkout-totals-value" style={{ color: 'var(--seims-success)' }}>Miễn phí</span>
                  </div>
                  <div className="customer-checkout-savings">
                    <span className="customer-checkout-totals-label">Tiết kiệm</span>
                    <span className="customer-checkout-totals-value" style={{ color: 'var(--seims-warning)' }}>-{totalSavings.toLocaleString()}đ</span>
                  </div>
                </div>

                <div className="customer-checkout-grand-total">
                  <span className="customer-checkout-grand-total-label">Tổng thanh toán</span>
                  <span className="customer-checkout-grand-total-value">
                    {(isMultiStore ? totalAmount : subtotal).toLocaleString()}đ
                  </span>
                </div>

                {isMultiStore && orderGroups.length > 1 && (
                  <div className="customer-checkout-multi-order-note">
                    <p>⚠️ Bạn có <strong>{orderGroups.length} đơn hàng</strong> từ các cửa hàng khác nhau.</p>
                    <p>Mỗi cửa hàng sẽ giao hàng riêng biệt.</p>
                  </div>
                )}
                {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (() => {
                  const storeCount = [...new Set(cartItems.map(i => i.storeId || i.store_id))].length;
                  return storeCount > 1 && (
                    <div className="customer-checkout-multi-order-note">
                      <p>ℹ️ Bạn sẽ có <strong>{storeCount} đơn hàng</strong> từ các cửa hàng khác nhau.</p>
                      <p>Mỗi cửa hàng sẽ giao hàng riêng biệt.</p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="customer-products-section customer-checkout-form-section">
          <div className="customer-section-header">
            <div>
              <h3 className="customer-section-title">Thông tin giao hàng</h3>
              <p className="customer-section-subtitle">Vui lòng điền đầy đủ thông tin</p>
              {isMultiStore && orderGroups.length > 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--seims-success)', marginTop: '0.5rem', fontWeight: '600' }}>
                  ✅ Đã giữ chỗ <strong>{totalOrders} đơn hàng</strong>
                </p>
              )}
              {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--seims-info)', marginTop: '0.5rem', fontWeight: '600' }}>
                  ℹ️ Đơn hàng sẽ được tạo khi bạn xác nhận
                </p>
              )}
              {!isMultiStore && isReserved && reservedOrderCode && (
                <p style={{ fontSize: '0.875rem', color: 'var(--seims-success)', marginTop: '0.5rem', fontWeight: '600' }}>
                  ✅ Hàng đã được giữ chỗ: <strong>{reservedOrderCode}</strong>
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="customer-checkout-form">
            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Họ và tên <span className="customer-checkout-required">*</span>
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

            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Số điện thoại <span className="customer-checkout-required">*</span>
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

            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Địa chỉ giao hàng <span className="customer-checkout-required">*</span>
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
              <div className="customer-checkout-address-actions">
                <button
                  type="button"
                  className="customer-checkout-address-save-btn"
                  disabled={!isAddressModified}
                  onClick={() => {
                    setOriginalAddress(formData.address);
                    setIsAddressModified(false);
                    const authRaw = localStorage.getItem('seims_auth_user');
                    const authUser = authRaw ? JSON.parse(authRaw) : null;
                    if (authUser) {
                      authUser.address = formData.address;
                      localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
                    }
                  }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>

            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                className="customer-checkout-textarea"
                rows="2"
                placeholder="Thời gian nhận hàng, yêu cầu đặc biệt..."
              />
            </div>

            <div className="customer-checkout-note">
              <p className="customer-checkout-note-title">Lưu ý quan trọng</p>
              <ul className="customer-checkout-note-list">
                <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>
                {isMultiStore && orderGroups.length > 1 && (
                  <li style={{ color: 'var(--seims-warning)' }}>
                    Bạn sẽ nhận {orderGroups.length} gói hàng từ các cửa hàng khác nhau
                  </li>
                )}
                {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (() => {
                  const storeCount = [...new Set(cartItems.map(i => i.storeId || i.store_id))].length;
                  return storeCount > 1 && (
                    <li style={{ color: 'var(--seims-info)' }}>
                      Bạn sẽ nhận {storeCount} gói hàng từ các cửa hàng khác nhau
                    </li>
                  );
                })()}
                <li>Thời gian giao hàng dự kiến: 30-60 phút</li>
                <li>Miễn phí vận chuyển cho đơn hàng cận hạn</li>
              </ul>
            </div>

            <button
              type="submit"
              className="customer-checkout-submit"
              disabled={(cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) || submitting}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
            </button>
          </form>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
};

export default CustomerCheckout;
