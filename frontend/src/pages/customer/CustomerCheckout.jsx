import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
import { fetchCustomerProductDetail, createMultiStoreOrder, fetchAvailableCoupons, confirmCustomerOrder, estimateShipping, initiatePayment, fetchCustomerSetting } from '../../services/customerApi';
import { LocationModal } from '../../components/map';
import { getCart, clearCart } from '../../services/cartUtils';
import './CustomerCheckout.css';

function Toast({ message, visible, onClose }) {
  if (!visible) return null;

  const isError = message.includes('Lỗi') || message.includes('Vui lòng') || message.includes('⚠️');

  return (
    <div className={`customer-checkout-toast ${isError ? 'error' : 'success'}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {!isError ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          )}
        </span>
        <p className="toast-message">{message}</p>
      </div>
      <button type="button" className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

// Coupon Modal Component
function CouponModal({ isOpen, onClose, coupons, selectedCoupon, onSelectCoupon, orderTotal }) {
  const [manualCode, setManualCode] = useState('');
  const [tempSelected, setTempSelected] = useState(selectedCoupon);

  // Sync temp selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedCoupon);
    }
  }, [isOpen, selectedCoupon]);

  if (!isOpen) return null;

  const isCouponApplicable = (coupon) => {
    if (!orderTotal) return false;
    const minAmount = coupon.minAmount || 0;
    return orderTotal >= minAmount;
  };

  const handleApplyManualCode = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    const found = coupons.find(c => c.code === code);
    if (found) {
      if (isCouponApplicable(found)) {
        setTempSelected(found);
        // Clear manual code after finding
        setManualCode('');
      } else {
        alert(`Đơn hàng không đủ điều kiện cho mã này (Tối thiểu: ${found.minAmount?.toLocaleString()}đ)`);
      }
    } else {
      alert('Mã ưu đãi không tồn tại hoặc đã hết hạn');
    }
  };

  const handleConfirm = () => {
    onSelectCoupon(tempSelected);
    onClose();
  };

  // Filter coupons based on manualCode (Search functionality)
  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(manualCode.toLowerCase()) ||
    (coupon.description && coupon.description.toLowerCase().includes(manualCode.toLowerCase()))
  );

  return (
    <div className="customer-checkout-coupon-modal-overlay" onClick={onClose}>
      <div className="customer-checkout-coupon-modal" onClick={e => e.stopPropagation()}>
        <div className="customer-checkout-coupon-modal-header">
          <h3>Chọn mã ưu đãi</h3>
          <button className="customer-checkout-coupon-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="customer-checkout-coupon-modal-body">
          {/* Manual Entry & Search Field */}
          <div className="customer-checkout-coupon-manual">
            <input
              type="text"
              placeholder="Tìm hoặc nhập mã ưu đãi..."
              className="customer-checkout-coupon-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              className="customer-checkout-coupon-apply-btn"
              onClick={handleApplyManualCode}
            >
              Tìm mã
            </button>
          </div>

          {filteredCoupons.length === 0 ? (
            <p className="customer-checkout-coupon-empty">
              {manualCode ? 'Không tìm thấy mã ưu đãi phù hợp' : 'Không có mã ưu đãi nào khả dụng'}
            </p>
          ) : (
            filteredCoupons.map(coupon => {
              const applicable = isCouponApplicable(coupon);
              const isSelected = tempSelected?.id === coupon.id;
              return (
                <div
                  key={coupon.id}
                  className={`customer-checkout-coupon-item ${applicable ? 'applicable' : 'not-applicable'} ${isSelected ? 'selected' : ''}`}
                  onClick={() => applicable && setTempSelected(isSelected ? null : coupon)}
                >
                  <div className="customer-checkout-coupon-radio">
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => { }}
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
          <button className="customer-checkout-coupon-btn" onClick={handleConfirm}>
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
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [walletBalance, setWalletBalance] = useState(0);

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

  // Load wallet balance
  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await fetchCustomerSetting();
        setWalletBalance(data.walletBalance || 0);
      } catch (err) {
        console.warn('Failed to load wallet balance:', err);
      }
    }
    loadProfile();
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

      // Tính subtotal theo từng store để backend xét ngưỡng miễn phí ship đúng
      const storeSubtotals = {};

      if (isMultiStore && orderGroups.length > 0) {
        // Nếu đã có đơn hàng (bước xác nhận), lấy tiền từ đơn hàng
        orderGroups.forEach(group => {
          storeSubtotals[group.storeId] = group.totalAmount - (group.shippingFee || 0);
        });
      } else {
        // Nếu chưa có đơn hàng (đang ở giỏ hàng), tính từ cartItems/cart
        const sourceItems = isMultiStore && cartItems.length > 0 ? cartItems : cart;
        sourceItems.forEach(item => {
          const sid = item.storeId || item.store_id;
          if (sid) {
            const price = item.salePrice || item.bestPrice || 0;
            storeSubtotals[sid] = (storeSubtotals[sid] || 0) + price * (item.quantity || 1);
          }
        });
      }


      for (const storeId of storeIds) {
        if (!storeId) continue;
        try {
          const orderAmount = storeSubtotals[storeId] || 0;
          const result = await estimateShipping(storeId, address, orderAmount);
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

  const backendShippingIncluded = (isMultiStore && orderGroups.length > 0)
    ? orderGroups.reduce((sum, g) => sum + (g.shippingFee || 0), 0)
    : 0;

  const cartSubtotal = cart.length > 0
    ? cart.reduce((sum, item) => sum + (item.salePrice || item.bestPrice || 0) * item.quantity, 0)
    : cartItems.reduce((sum, item) => sum + (item.salePrice || item.bestPrice || 0) * item.quantity, 0);

  // OLD flow: dùng totalAmount - shippingFee để lấy đúng product subtotal (sale_price thực tế)
  // Tránh double-shipping: group.items dùng base_price không chính xác
  const productSubtotal = (isMultiStore && orderGroups.length > 0)
    ? orderGroups.reduce((sum, g) => sum + (g.totalAmount - (g.shippingFee || 0)), 0)
    : cartSubtotal;

  // Prevent negative subtotal (edge case for old orders)
  const safeProductSubtotal = Math.max(0, productSubtotal);

  // Calculate coupon discount based on product subtotal only
  const couponDiscount = selectedCoupon
    ? Math.round(safeProductSubtotal * selectedCoupon.discountPercent / 100)
    : 0;

  // Final total: product subtotal - coupon + shipping (from frontend estimate)
  // For orderGroups flow: backend already calculated shipping, use that
  // For new cart flow: use frontend estimate
  const effectiveShippingFee = (isMultiStore && orderGroups.length > 0)
    ? backendShippingIncluded
    : totalShippingFee;
  const finalTotal = safeProductSubtotal - couponDiscount + effectiveShippingFee;

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

        // Create multi-store orders with selected payment method
        const result = await createMultiStoreOrder({
          items: itemsForOrder,
          paymentMethod,
          shippingAddress: formData.address,
          couponId: selectedCoupon?.id || null,
        });

        if (paymentMethod === 'cod' || paymentMethod === 'wallet') {
          // COD or Wallet: Confirm all orders (deduct stock/balance)
          for (const group of result.orderGroups) {
            await confirmCustomerOrder(group.orderId, paymentMethod);
          }
          const orderCodes = result.orderGroups.map(g => g.orderCode).join(', ');
          const methodLabel = paymentMethod === 'cod' ? 'COD' : 'Ví SEIMS';
          setToast({
            visible: true,
            message: `Đặt hàng bằng ${methodLabel} thành công!\n${result.totalOrders} đơn: ${orderCodes}`
          });
          setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
            navigate('/customer/orders');
          }, 3000);
          clearCart();
          return;
        } else {
          // VNPay: Pay ALL orders in the group
          const allOrderIds = result.orderGroups.map(g => g.orderId);
          console.log('[VNPay] Initiating payment for orders:', allOrderIds);
          const paymentResult = await initiatePayment(allOrderIds, paymentMethod);
          console.log('[VNPay] Payment result:', paymentResult);
          const redirectUrl = paymentResult.redirect_url || paymentResult.payment_url;
          console.log('[VNPay] Redirecting to:', redirectUrl);
          window.location.href = redirectUrl;
          return;
        }
      }

      // OLD FLOW: Multi-Store Orders already created (pre-created orders)
      if (isMultiStore && orderGroups.length > 0) {
        const authRaw = localStorage.getItem('seims_auth_user');
        const authUser = authRaw ? JSON.parse(authRaw) : null;
        if (authUser) {
          authUser.address = formData.address;
          localStorage.setItem('seims_auth_user', JSON.stringify(authUser));
        }

        if (paymentMethod === 'cod' || paymentMethod === 'wallet') {
          // COD or Wallet: Confirm payment for all orders
          for (const group of orderGroups) {
            await confirmCustomerOrder(group.orderId, paymentMethod);
          }

          // Format order codes
          const orderCodes = orderGroups.map(g => g.orderCode).join(', ');
          const methodLabel = paymentMethod === 'cod' ? 'COD' : 'Ví SEIMS';
          setToast({
            visible: true,
            message: `Đặt hàng bằng ${methodLabel} thành công!\n${totalOrders} đơn: ${orderCodes}`
          });
          setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
            navigate('/customer/orders');
          }, 3000);
        } else {
          // VNPay: Pay ALL orders in the group
          const allOrderIds = orderGroups.map(g => g.orderId);
          clearCart();
          const paymentResult = await initiatePayment(allOrderIds, paymentMethod);
          window.location.href = paymentResult.redirect_url || paymentResult.payment_url;
        }
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
        setToast({ visible: true, message: `Đặt hàng thành công!\nMã đơn: ${reservedOrderCode}` });
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
            {(cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) ? (
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
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  <span>{selectedCoupon ? `Mã: ${selectedCoupon.code}` : 'Seims ưu đãi'}</span>
                  <span className="customer-checkout-coupon-arrow">›</span>
                </button>

                <div className="customer-checkout-totals">
                  <div className="customer-checkout-totals-row">
                    <span className="customer-checkout-totals-label">Tạm tính</span>
                    <span className="customer-checkout-totals-value">
                      {safeProductSubtotal.toLocaleString()}đ
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

            {/* Payment Method Selector */}
            <div className="customer-checkout-form-group">
              <label className="customer-checkout-field">Phương thức thanh toán <span className="customer-checkout-required">*</span></label>
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--seims-border)', borderRadius: '10px', background: paymentMethod === 'cod' ? 'var(--seims-mint)' : 'var(--seims-bg)' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Thanh toán khi nhận hàng (COD)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid var(--seims-border)', borderRadius: '10px', background: paymentMethod === 'vnpay' ? 'linear-gradient(135deg, #005baa, #0077d9)' : 'var(--seims-bg)', color: paymentMethod === 'vnpay' ? 'white' : 'inherit' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="vnpay"
                    checked={paymentMethod === 'vnpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '18px', height: '18px', accentColor: 'white' }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>VNPay (Thanh toán online)</span>
                </label>

                {/* Wallet Payment Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  border: '1px solid var(--seims-border)',
                  borderRadius: '10px',
                  background: paymentMethod === 'wallet' ? 'var(--seims-teal)' : 'var(--seims-bg)',
                  color: paymentMethod === 'wallet' ? 'white' : 'inherit'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '18px', height: '18px', accentColor: 'white' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>Ví SEIMS (Số dư: {walletBalance.toLocaleString()}đ)</span>
                    {paymentMethod === 'wallet' && walletBalance < finalTotal && (
                      <span style={{ fontSize: '0.75rem', color: '#ff4d4f', fontWeight: '600', background: 'white', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', width: 'fit-content' }}>
                        Số dư không đủ
                      </span>
                    )}
                  </div>
                </label>
              </div>

            </div>

            <div className="customer-checkout-note">
              <p className="customer-checkout-note-title">Lưu ý quan trọng</p>
              <ul className="customer-checkout-note-list">
                <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>

                <li>Thời gian giao hàng dự kiến: 30-60 phút</li>
              </ul>
            </div>

            <button
              type="submit"
              className="customer-checkout-submit"
              disabled={(cart.length === 0 && orderGroups.length === 0 && itemsForOrder.length === 0) || submitting || hasBlockedStore || shippingLoading || (paymentMethod === 'wallet' && walletBalance < finalTotal)}
            >
              {submitting ? 'Đang xử lý...' : shippingLoading ? 'Đang tính phí ship...' : hasBlockedStore ? 'Ngoài phạm vi giao hàng' : (paymentMethod === 'wallet' && walletBalance < finalTotal) ? 'Số dư ví không đủ' : (paymentMethod === 'vnpay' ? 'Thanh toán ngay' : 'Đặt hàng ngay')}
            </button>
          </form>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

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
        orderTotal={safeProductSubtotal}
      />
    </div>
  );
};

export default CustomerCheckout;
