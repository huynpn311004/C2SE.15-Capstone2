import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
import { fetchCustomerProductDetail, createMultiStoreOrder, fetchAvailableCoupons, confirmCustomerOrder, estimateShipping } from '../../services/customerApi';
import { LocationModal } from '../../components/map';
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

// Coupon Modal Component
function CouponModal({ isOpen, onClose, coupons, selectedCoupon, onSelectCoupon, orderTotal }) {
  if (!isOpen) return null;

  const isCouponApplicable = (coupon) => {
    if (!orderTotal) return false;
    const minAmount = coupon.minAmount || 0;
    return orderTotal >= minAmount;
  };

  return (
    <div className="customer-checkout-coupon-modal-overlay" onClick={onClose}>
      <div className="customer-checkout-coupon-modal" onClick={e => e.stopPropagation()}>
        <div className="customer-checkout-coupon-modal-header">
          <h3>Chọn mã ưu đãi</h3>
          <button className="customer-checkout-coupon-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="customer-checkout-coupon-modal-body">
          {coupons.length === 0 ? (
            <p className="customer-checkout-coupon-empty">Không có mã ưu đãi nào khả dụng</p>
          ) : (
            coupons.map(coupon => {
              const applicable = isCouponApplicable(coupon);
              const isSelected = selectedCoupon?.id === coupon.id;
              return (
                <div
                  key={coupon.id}
                  className={`customer-checkout-coupon-item ${applicable ? 'applicable' : 'not-applicable'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => applicable && onSelectCoupon(isSelected ? null : coupon)}
                >
                  <div className="customer-checkout-coupon-radio">
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={!applicable}
                    />
                  </div>
                  <div className="customer-checkout-coupon-content">
                    <div className="customer-checkout-coupon-code">{coupon.code}</div>
                    <div className="customer-checkout-coupon-desc">{coupon.description || `Giảm ${coupon.discountPercent}% cho đơn hàng`}</div>
                    <div className="customer-checkout-coupon-info">
                      {coupon.minAmount && (
                        <span>Đơn tối thiểu: {coupon.minAmount.toLocaleString()}đ</span>
                      )}
                      <span>HSD: {coupon.validTo}</span>
                    </div>
                  </div>
                  <div className="customer-checkout-coupon-discount">
                    -{coupon.discountPercent}%
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="customer-checkout-coupon-modal-footer">
          <button className="customer-checkout-coupon-btn" onClick={onClose}>
            Xác nhận
          </button>
        </div>
      </div>
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [shippingData, setShippingData] = useState({});
  const [shippingLoading, setShippingLoading] = useState(false);

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

      setLoading(false);
    }

    loadCartWithFreshPrices();
  }, []);

  // Load available coupons
  useEffect(() => {
    async function loadCoupons() {
      try {
        const coupons = await fetchAvailableCoupons();
        setAvailableCoupons(coupons);
      } catch (err) {
        console.warn('Failed to load coupons:', err);
      }
    }
    loadCoupons();
  }, []);

  // Estimate shipping fee when address is available
  useEffect(() => {
    async function loadShippingEstimates() {
      const address = formData.address;
      if (!address || address.trim() === '') return;

      // Get unique store IDs from cart or orderGroups
      let storeIds = [];
      if (isMultiStore && orderGroups.length > 0) {
        storeIds = [...new Set(orderGroups.map(g => g.storeId))];
      } else if (isMultiStore && cartItems.length > 0) {
        storeIds = [...new Set(cartItems.map(i => i.storeId || i.store_id))];
      } else if (cart.length > 0) {
        storeIds = [...new Set(cart.map(i => i.storeId || i.store_id))];
      }

      if (storeIds.length === 0) return;

      setShippingLoading(true);
      const newShippingData = {};

      for (const storeId of storeIds) {
        if (!storeId) continue;
        try {
          const result = await estimateShipping(storeId, address, 0);
          newShippingData[storeId] = result;
        } catch (err) {
          console.warn(`Shipping estimate failed for store ${storeId}:`, err);
          newShippingData[storeId] = { fee: 0, zone: 'normal', deliverable: true, message: 'Miễn phí vận chuyển', distanceKm: 0 };
        }
      }

      setShippingData(newShippingData);
      setShippingLoading(false);
    }

    if (!loading) {
      loadShippingEstimates();
    }
  }, [formData.address, loading]);

  const handleSelectCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setShowCouponModal(false);
  };

  // Calculate total shipping fee from all stores
  const totalShippingFee = Object.values(shippingData).reduce((sum, data) => {
    return sum + (data.fee || 0);
  }, 0);

  // Check if any store is blocked
  const hasBlockedStore = Object.values(shippingData).some(d => !d.deliverable);
  const hasWarningStore = Object.values(shippingData).some(d => d.zone === 'warning');

  // When orderGroups exist, backend already included shipping in totalAmount
  // So we need to extract the backend-included shipping to show correct subtotal
  const backendShippingIncluded = (isMultiStore && orderGroups.length > 0)
    ? orderGroups.reduce((sum, g) => sum + (g.shippingFee || 0), 0)
    : 0;

  // The actual product subtotal (without shipping)
  const productSubtotal = isMultiStore
    ? (totalAmount - backendShippingIncluded)
    : subtotal;

  // Calculate coupon discount based on product subtotal only
  const couponDiscount = selectedCoupon
    ? Math.round(productSubtotal * selectedCoupon.discountPercent / 100)
    : 0;

  // Final total: product subtotal - coupon + shipping (from frontend estimate)
  // For orderGroups flow: backend already calculated shipping, use that
  // For new cart flow: use frontend estimate
  const effectiveShippingFee = (isMultiStore && orderGroups.length > 0)
    ? backendShippingIncluded
    : totalShippingFee;
  const finalTotal = productSubtotal - couponDiscount + effectiveShippingFee;

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

  const handleLocationSelect = (locationData) => {
    setFormData(prev => ({
      ...prev,
      address: locationData.address
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) {
      setToast({ visible: true, message: 'Giỏ hàng trống! Vui lòng thêm sản phẩm.' });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return;
    }

    // Block if any store is out of delivery range
    if (hasBlockedStore) {
      setToast({ visible: true, message: '⚠️ Một số cửa hàng nằm ngoài phạm vi giao hàng. Vui lòng kiểm tra lại địa chỉ.' });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return;
    }

    try {
      setSubmitting(true);

      // NEW FLOW: Create orders from cart items with user-entered address
      if (isMultiStore && itemsForOrder.length > 0) {
        // Validate address is provided
        if (!formData.address || formData.address.trim() === '') {
          setToast({ visible: true, message: ' Vui lòng nhập địa chỉ giao hàng!' });
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
        setToast({
          visible: true,
          message: ` Đặt hàng thành công!\n${result.totalOrders} đơn: ${orderCodes}`
        });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/customer/orders');
        }, 3000);
        return;
      }

      // OLD FLOW: Multi-Store Orders already created (pre-created orders)
      if (isMultiStore && orderGroups.length > 0) {
        const authRaw = localStorage.getItem('seims_auth_user');
        const authUser = authRaw ? JSON.parse(authRaw) : null;
        if (authUser) {
          authUser.address = formData.address;
          localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
        }

        // Confirm payment for all orders
        for (const group of orderGroups) {
          await confirmCustomerOrder(group.orderId);
        }

        // Format order codes
        const orderCodes = orderGroups.map(g => g.orderCode).join(', ');
        setToast({
          visible: true,
          message: `✅ Thanh toán thành công!\n${totalOrders} đơn: ${orderCodes}`
        });
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
          navigate('/customer/orders');
        }, 3000);
        return;
      }

      // Legacy single order support
      if (isReserved && reservedOrderId) {
        const authRaw = localStorage.getItem('seims_auth_user');
        const authUser = authRaw ? JSON.parse(authRaw) : null;
        if (authUser) {
          authUser.address = formData.address;
          localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
        }

        clearCart();
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

                {/* Coupon Selection */}
                <button
                  className="customer-checkout-coupon-btn-row"
                  onClick={() => setShowCouponModal(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px' }}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  <span>{selectedCoupon ? `Mã: ${selectedCoupon.code}` : 'Seims ưu đãi'}</span>
                  <span className="customer-checkout-coupon-arrow">›</span>
                </button>

                <div className="customer-checkout-totals">
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Tạm tính</span>
                    <span className="customer-checkout-totals-value">
                      {productSubtotal.toLocaleString()}đ
                    </span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="customer-checkout-totals-row" style={{ color: 'var(--seims-success)' }}>
                      <span className="customer-checkout-totals-label">Mã ưu đãi ({selectedCoupon?.code})</span>
                      <span className="customer-checkout-totals-value">-{couponDiscount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Phí vận chuyển</span>
                    <span className="customer-checkout-totals-value" style={{ color: hasBlockedStore ? '#ff4d4f' : effectiveShippingFee > 0 ? 'var(--seims-warning)' : 'var(--seims-success)' }}>
                      {shippingLoading ? 'Đang tính...' : hasBlockedStore ? 'Không hỗ trợ' : effectiveShippingFee > 0 ? `${effectiveShippingFee.toLocaleString()}đ` : 'Miễn phí'}
                    </span>
                  </div>
                </div>

                {/* Shipping warnings */}
                {hasBlockedStore && (
                  <div style={{ background: '#fff3f3', border: '1px solid #ff4d4f', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                    <p style={{ color: '#ff4d4f', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
                      ⚠️ Một số cửa hàng nằm ngoài phạm vi giao hàng (&gt;15km). Vui lòng thay đổi địa chỉ.
                    </p>
                  </div>
                )}
                {hasWarningStore && !hasBlockedStore && (
                  <div style={{ background: '#fffbe6', border: '1px solid #faad14', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                    <p style={{ color: '#d48806', fontWeight: 500, fontSize: '0.85rem', margin: 0 }}>
                      ⚡ Khoảng cách giao hàng xa (10-15km). Thời gian giao hàng có thể lâu hơn.
                    </p>
                  </div>
                )}

                {/* Shipping breakdown per store */}
                {Object.keys(shippingData).length > 1 && (
                  <div style={{ background: 'var(--seims-bg-card, #f8f9fa)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--seims-text)' }}>Chi tiết phí ship:</p>
                    {Object.entries(shippingData).map(([storeId, data]) => (
                      <div key={storeId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--seims-muted)' }}>
                        <span>{data.storeName || `Cửa hàng`} ({data.distanceKm?.toFixed(1)}km)</span>
                        <span style={{ color: data.fee > 0 ? 'var(--seims-warning)' : 'var(--seims-success)' }}>
                          {!data.deliverable ? 'Ngoài phạm vi' : data.fee > 0 ? `${data.fee.toLocaleString()}đ` : 'Miễn phí'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="customer-checkout-grand-total">
                  <span className="customer-checkout-grand-total-label">Tổng thanh toán</span>
                  <span className="customer-checkout-grand-total-value">
                    {finalTotal.toLocaleString()}đ
                  </span>
                </div>

                {isMultiStore && orderGroups.length > 1 && (
                  <div className="customer-checkout-multi-order-note">
                    <p> Bạn có <strong>{orderGroups.length} đơn hàng</strong> từ các cửa hàng khác nhau.</p>
                    <p>Mỗi cửa hàng sẽ giao hàng riêng biệt.</p>
                  </div>
                )}
                {isMultiStore && cartItems.length > 0 && orderGroups.length === 0 && (() => {
                  const storeCount = [...new Set(cartItems.map(i => i.storeId || i.store_id))].length;
                  return storeCount > 1 && (
                    <div className="customer-checkout-multi-order-note">
                      <p> Bạn sẽ có <strong>{storeCount} đơn hàng</strong> từ các cửa hàng khác nhau.</p>
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
              {!isMultiStore && isReserved && reservedOrderCode && (
                <p style={{ fontSize: '0.875rem', color: 'var(--seims-success)', marginTop: '0.5rem', fontWeight: '600' }}>
                  Hàng đã được giữ chỗ: <strong>{reservedOrderCode}</strong>
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="customer-checkout-form">
            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Họ và tên
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                readOnly
                className="customer-checkout-input"
              />
            </div>

            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Số điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                readOnly
                className="customer-checkout-input"
              />
            </div>

            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">
                Địa chỉ giao hàng
              </label>
              <textarea
                name="address"
                required
                value={formData.address}
                readOnly
                className="customer-checkout-textarea"
                rows="3"
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
              </ul>
            </div>

            <button
              type="submit"
              className="customer-checkout-submit"
              disabled={(cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) || submitting || hasBlockedStore || shippingLoading}
            >
              {submitting ? 'Đang xử lý...' : shippingLoading ? 'Đang tính phí ship...' : hasBlockedStore ? 'Ngoài phạm vi giao hàng' : (orderGroups.length > 0 ? 'Xác nhận thanh toán' : 'Xác nhận đặt hàng')}
            </button>
          </form>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} />

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleLocationSelect}
        initialAddress={formData.address}
      />

      <CouponModal
        isOpen={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        coupons={availableCoupons}
        selectedCoupon={selectedCoupon}
        onSelectCoupon={handleSelectCoupon}
        orderTotal={productSubtotal}
      />
    </div>
  );
};

export default CustomerCheckout;
