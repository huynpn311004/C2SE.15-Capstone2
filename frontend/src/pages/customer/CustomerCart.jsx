import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
import { validateCartStock, fetchCustomerProductDetail, createMultiStoreOrder } from '../../services/customerApi';
import { getCart, setCart, removeFromCart, updateCartItemQuantity, clearCart } from '../../services/cartUtils';
import './CustomerCart.css';

const saveCart = setCart;

function Toast({ message, visible, onClose }) {
  if (!visible) return null;

  const isError = message.includes('Lỗi') || message.includes('Vui lòng') || message.includes('⚠️');

  return (
    <div className={`cart-toast ${isError ? 'error' : 'success'}`}>
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

const CustomerCart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [cartInitialized, setCartInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // productId cần xóa
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: boolean }

  const getProfile = () => {
    try {
      const authRaw = localStorage.getItem('seims_auth_user');
      const authUser = authRaw ? JSON.parse(authRaw) : null;
      return authUser || {};
    } catch { return {}; }
  };

  const profile = getProfile();
  const shippingAddress = profile.address || '';

  // Initialize selected items when cart is loaded (start with none selected)
  // Use a composite key of id-storeId-lotCode to handle duplicate products across stores
  const getCartItemKey = (item) => `${item.id}-${item.storeId || item.store_id || 0}-${item.lotCode || item.lot_code || ''}`;

  useEffect(() => {
    if (cart.length > 0) {
      setSelectedItems(prev => {
        const updated = { ...prev };
        let changed = false;
        cart.forEach(item => {
          const key = getCartItemKey(item);
          if (updated[key] === undefined) {
            updated[key] = false;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [cart.length]);

  // Toggle select single item
  const toggleSelectItem = (item) => {
    const key = getCartItemKey(item);
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Select all items in a store
  const toggleSelectStore = (storeId, items) => {
    const allSelected = items.every(item => selectedItems[getCartItemKey(item)]);
    setSelectedItems(prev => {
      const updated = { ...prev };
      items.forEach(item => { updated[getCartItemKey(item)] = !allSelected; });
      return updated;
    });
  };

  // Select/deselect all items
  const toggleSelectAll = () => {
    const allSelected = cart.length > 0 && cart.every(item => selectedItems[getCartItemKey(item)]);
    const updated = {};
    cart.forEach(item => { updated[getCartItemKey(item)] = !allSelected; });
    setSelectedItems(updated);
  };

  const handleDeleteItem = (productId) => {
    setDeleteConfirm(productId);
  };

  // Delete confirmation modal
  const DeleteConfirmModal = () => {
    if (!deleteConfirm) return null;
    const item = cart.find(i => i.id === deleteConfirm);
    return (
      <div className="cart-modal-overlay" onClick={() => setDeleteConfirm(null)}>
        <div className="cart-modal" onClick={e => e.stopPropagation()}>
          <p className="cart-modal-icon">🗑</p>
          <p className="cart-modal-title">Xóa sản phẩm?</p>
          <p className="cart-modal-text">
            Bạn có muốn xóa <strong>"{item?.name}"</strong> khỏi giỏ hàng không?
          </p>
          <div className="cart-modal-actions">
            <button
              className="cart-modal-cancel"
              onClick={() => setDeleteConfirm(null)}
            >
              Hủy
            </button>
            <button
              className="cart-modal-confirm"
              onClick={() => {
                removeFromCart(deleteConfirm);
                showToast('Đã xóa sản phẩm khỏi giỏ hàng');
                setDeleteConfirm(null);
              }}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    async function loadCartWithFreshPrices() {
      try {
        const stored = getCart();

        if (!isMounted) return;

        // Initialize with stored cart immediately
        if (stored.length > 0) {
          // Normalize items immediately to handle both salePrice/bestPrice and discount/bestDiscount
          const normalized = stored.map(item => ({
            ...item,
            salePrice: item.salePrice || item.bestPrice || 0,
            discount: item.discount !== undefined ? item.discount : (item.bestDiscount || 0),
            originalPrice: item.originalPrice || item.base_price || 0
          }));
          setCart(normalized);
        }
        setCartInitialized(true);

        // Fetch fresh prices for each unique product from server
        const productIds = [...new Set(stored.map(item => item.id))];

        if (productIds.length === 0) return;

        const freshPricesMap = {};

        try {
          // Fetch fresh prices for all products in parallel with timeout
          const fetchWithTimeout = (id) => {
            return new Promise((resolve) => {
              const timeout = setTimeout(() => resolve(null), 3000);
              fetchCustomerProductDetail(id)
                .then(result => {
                  clearTimeout(timeout);
                  resolve(result);
                })
                .catch(() => {
                  clearTimeout(timeout);
                  resolve(null);
                });
            });
          };

          const results = await Promise.all(productIds.map(id => fetchWithTimeout(id)));

          results.forEach(productDetail => {
            if (productDetail) {
              freshPricesMap[productDetail.id] = {
                salePrice: productDetail.bestPrice || productDetail.salePrice,
                originalPrice: productDetail.originalPrice,
                discount: productDetail.bestDiscount || productDetail.discount,
                daysLeft: productDetail.daysLeft || 0,
                stores: productDetail.stores || [],   // include lot-level price detail
              };
            }
          });
        } catch (err) {
          console.warn('Failed to fetch fresh prices, using cached prices');
        }

        if (!isMounted) return;

        // Merge fresh prices with cart items
        // IMPORTANT: Use the price for the specific lotCode in the cart, not bestPrice
        const updatedCart = stored.map(item => {
          const fresh = freshPricesMap[item.id];
          if (fresh) {
            // Try to find the exact lot stored in the cart item
            const cartLotCode = item.lotCode || item.lot_code;
            const cartStoreId = item.storeId || item.store_id;
            const matchingLot = cartLotCode && fresh.stores
              ? fresh.stores.find(s => s.lotCode === cartLotCode)
              : null;

            if (matchingLot) {
              // Found the exact lot — use its price & discount
              return {
                ...item,
                salePrice: matchingLot.salePrice,
                originalPrice: fresh.originalPrice,
                discount: matchingLot.discount,
                daysLeft: matchingLot.daysLeft,
              };
            } else {
              // Lot not found (may have been sold out) — fall back to bestPrice
              return {
                ...item,
                salePrice: fresh.salePrice,
                originalPrice: fresh.originalPrice,
                discount: fresh.discount,
                daysLeft: fresh.daysLeft,
              };
            }
          }
          return item;
        });

        setCart(updatedCart);
      } catch (err) {
        console.error('Error loading cart:', err);
        if (isMounted) {
          setCart(getCart());
          setCartInitialized(true);
        }
      }
    }

    // Fallback timeout - ensure cart is initialized after 5 seconds max
    fallbackTimer = setTimeout(() => {
      if (isMounted && !cartInitialized) {
        console.warn('Cart initialization timeout - forcing render');
        setCart(getCart());
        setCartInitialized(true);
      }
    }, 5000);

    loadCartWithFreshPrices();

    const handleUpdate = () => {
      if (isMounted) {
        const stored = getCart();
        // Normalize on external update too
        const normalized = stored.map(item => ({
          ...item,
          salePrice: item.salePrice || item.bestPrice || 0,
          discount: item.discount !== undefined ? item.discount : (item.bestDiscount || 0),
          originalPrice: item.originalPrice || item.base_price || 0
        }));
        setCart(normalized);
      }
    };
    window.addEventListener('seims-cart-updated', handleUpdate);

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      window.removeEventListener('seims-cart-updated', handleUpdate);
    };
  }, []);

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      removeFromCart(deleteConfirm);
      showToast('Đã xóa sản phẩm khỏi giỏ hàng');
      setDeleteConfirm(null);
    }
  };

  const handleCheckout = async () => {
    if (selectedCartItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng.');
      return;
    }

    try {
      setIsProcessing(true);

      // Get user info
      const authRaw = localStorage.getItem('seims_auth_user');
      const authUser = authRaw ? JSON.parse(authRaw) : null;

      if (!authUser?.id) {
        showToast('Vui lòng đăng nhập lại');
        return;
      }

      // Check if shipping address is available
      if (!shippingAddress) {
        showToast('Vui lòng cập nhật địa chỉ giao hàng trong hồ sơ trước khi thanh toán.');
        setIsProcessing(false);
        return;
      }

      // Validate all selected cart items stock before checkout
      const validationItems = selectedCartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        storeId: item.storeId || item.store_id,
        lotCode: item.lotCode || item.lot_code
      }));

      const validation = await validateCartStock(validationItems);

      if (!validation.valid) {
        const outOfStock = validation.outOfStockItems.join('\n• ');
        showToast(`Một số sản phẩm hết hàng:\n• ${outOfStock}`);
        setIsProcessing(false);
        return;
      }

      // Create orders immediately to reserve stock (payment method set later at checkout)
      const result = await createMultiStoreOrder({
        items: validationItems,
        shippingAddress: shippingAddress,
      });


      showToast('Vui lòng xác nhận thông tin.');

      setTimeout(() => {
        // Xóa các sản phẩm đã đặt khỏi giỏ hàng chỉ sau khi đã điều hướng sang trang checkout
        navigate('/customer/checkout', {
          state: {
            orderGroups: result.orderGroups,
            totalAmount: result.totalAmount,
            isMultiStore: true,
            totalOrders: result.totalOrders,
          }
        });
        // Xóa sản phẩm khỏi giỏ hàng
        const cartNow = getCart();
        const remainingCart = cartNow.filter(item => !selectedItems[getCartItemKey(item)]);
        saveCart(remainingCart);
        window.dispatchEvent(new Event('seims-cart-updated'));
      }, 1500);

    } catch (err) {
      console.error('Failed to create orders:', err);
      const errorMsg = err.response?.data?.detail || 'Lỗi! Vui lòng thử lại.';
      showToast(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (productId) => {
    setDeleteConfirm(productId);
  };

  const handleClearCart = () => {
    clearCart();
    setCart([]);
    showToast('Đã xóa toàn bộ giỏ hàng');
  };

  // Group cart items by store for display
  const storeGroups = cart.reduce((groups, item) => {
    const storeId = item.storeId || item.store_id;
    if (!groups[storeId]) {
      groups[storeId] = {
        storeId,
        storeName: item.storeName || item.shop || `Cửa hàng ${storeId}`,
        storeAddress: item.storeAddress || '',
        items: []
      };
    }
    groups[storeId].items.push(item);
    return groups;
  }, {});

  const groupList = Object.values(storeGroups);

  // Get selected items only
  const selectedCartItems = cart.filter(item => selectedItems[getCartItemKey(item)]);

  const subtotal = selectedCartItems.reduce((sum, item) => {
    const price = item.salePrice || item.bestPrice || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = selectedCartItems.reduce((sum, item) => {
    const original = item.originalPrice || 0;
    const sale = item.salePrice || item.bestPrice || 0;
    return sum + (original - sale) * item.quantity;
  }, 0);

  // Get selected items grouped by store
  const selectedStoreGroups = selectedCartItems.reduce((groups, item) => {
    const storeId = item.storeId || item.store_id;
    if (!groups[storeId]) {
      groups[storeId] = {
        storeId,
        storeName: item.storeName || item.shop || `Cửa hàng ${storeId}`,
        storeAddress: item.storeAddress || '',
        items: []
      };
    }
    groups[storeId].items.push(item);
    return groups;
  }, {});

  const selectedGroupList = Object.values(selectedStoreGroups);
  const selectedCount = selectedCartItems.length;

  if (!cartInitialized) {
    return (
      <div className="cart-page" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--seims-muted)', padding: '2rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>Đang tải giỏ hàng...</div>
          <div style={{ fontSize: '0.8rem' }}>Vui lòng đợi</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cart-page">
        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-products-section cart-items-section">
            <div className="cart-section-header">
              <div className="cart-header-left">
                <h3 className="cart-section-title">Danh sách sản phẩm</h3>
                <p className="cart-section-subtitle">{cart.length} sản phẩm trong giỏ hàng</p>
              </div>
              <div className="cart-header-right">
                {cart.length > 0 && (
                  <button className="cart-clear-btn" onClick={handleClearCart}>
                    Xóa tất cả
                  </button>
                )}
                {cart.length > 0 && (
                  <label className="cart-select-all" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={cart.length > 0 && cart.every(item => selectedItems[getCartItemKey(item)])}
                      onChange={toggleSelectAll}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                    />
                    <span>Chọn tất cả</span>
                  </label>
                )}
              </div>
            </div>

            <div className="cart-content">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <p className="cart-empty-title">Giỏ hàng trống</p>
                </div>
              ) : (
                groupList.map((group, groupIdx) => (
                  <div key={group.storeId} className="cart-store-group">
                    {/* Store Header */}
                    <div className="cart-store-header">
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={group.items.length > 0 && group.items.every(item => selectedItems[getCartItemKey(item)])}
                          onChange={() => toggleSelectStore(group.storeId, group.items)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                        />
                      </label>
                      <div className="cart-store-info">
                        <h4 className="cart-store-name">{group.storeName}</h4>
                        {group.storeAddress && (
                          <span className="cart-store-address">{group.storeAddress}</span>
                        )}
                      </div>
                      <span className="cart-store-badge">{group.items.length} sản phẩm</span>
                    </div>

                    {/* Items in this store */}
                    {group.items.map((item) => (
                      <div key={`${item.id}-${item.lotCode || item.lot_code}`} className={`cart-item ${!selectedItems[getCartItemKey(item)] ? 'cart-item-unselected' : ''}`}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!selectedItems[getCartItemKey(item)]}
                            onChange={() => toggleSelectItem(item)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                          />
                        </label>
                        <div className="cart-item-image">
                          <img src={getProductImageUrl(item.imageUrl || item.image)} alt={item.name} />
                        </div>
                        <div className="cart-item-info">
                          <h4 className="cart-item-name">{item.name}</h4>
                          <div className="cart-item-meta">
                            <span className="cart-discount-badge">-{item.discount || 0}%</span>
                          </div>
                          <div className="cart-item-pricing">
                            {item.originalPrice > 0 && item.discount > 0 && (
                              <span className="cart-item-original-price">
                                {item.originalPrice.toLocaleString()}đ
                              </span>
                            )}
                            <span className="cart-item-sale-price">
                              {(item.salePrice || item.bestPrice || 0).toLocaleString()}đ
                            </span>
                          </div>
                          <div className="cart-item-qty-controls">
                            <button
                              className="cart-qty-btn"
                              onClick={() => updateCartItemQuantity(item.id, -1, handleDeleteItem)}
                              title="Giảm"
                            >
                              −
                            </button>
                            <span className="cart-qty-value">{item.quantity}</span>
                            <button
                              className="cart-qty-btn"
                              onClick={() => updateCartItemQuantity(item.id, 1)}
                              title="Tăng"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-price">
                          <p className="cart-item-price-value">
                            {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                          </p>
                          <p className="cart-item-price-qty">x{item.quantity}</p>
                        </div>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="cart-item-remove"
                          title="Xóa khỏi giỏ hàng"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="cart-products-section cart-summary-section">
            {selectedCount > 0 ? (
              <>
                <div className="cart-section-header">
                  <div className="cart-header-left">
                    <h3 className="cart-section-title">Tóm tắt đơn hàng</h3>
                    <p className="cart-section-subtitle">{selectedCount} sản phẩm đã chọn</p>
                  </div>
                </div>

                <div className="cart-content">
                  {/* Summary by store */}
                  {selectedGroupList.length > 1 && selectedGroupList.map((group, idx) => {
                    const groupTotal = group.items.reduce((sum, item) => {
                      return sum + (item.salePrice || item.bestPrice || 0) * item.quantity;
                    }, 0);
                    return (
                      <div key={group.storeId} className="cart-store-summary">
                        <div className="cart-store-summary-header">
                          <span>{group.storeName}</span>
                          <span>{groupTotal.toLocaleString()}đ</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected items list */}
                  {selectedCartItems.map(item => (
                    <div key={item.id} className="cart-summary-row">
                      <span className="cart-summary-label">{item.name} x{item.quantity}</span>
                      <span className="cart-summary-value">
                        {((item.salePrice || item.bestPrice || 0) * item.quantity).toLocaleString()}đ
                      </span>
                    </div>
                  ))}

                  {totalSavings > 0 && (
                    <div className="cart-summary-savings">
                      <span className="cart-summary-label">Tiết kiệm</span>
                      <span className="cart-summary-value" style={{ color: 'var(--seims-warning)' }}>
                        -{totalSavings.toLocaleString()}đ
                      </span>
                    </div>
                  )}

                  <div className="cart-grand-total">
                    <span className="cart-grand-total-label">Tổng thanh toán</span>
                    <span className="cart-grand-total-value">{subtotal.toLocaleString()}đ</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="cart-add-to-cart-btn"
                    style={{ padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Đang xử lý...' : 'Thanh toán ngay'}
                  </button>

                  <button
                    onClick={() => navigate('/customer/home')}
                    className="cart-filter-btn"
                    style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    Tiếp tục mua sắm
                  </button>
                </div>
              </>
            ) : (
              <div className="cart-content" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--seims-muted)' }}>
                <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>🛒</p>
                <p style={{ margin: 0 }}>Chọn sản phẩm để xem tóm tắt</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast visible={toast.visible} message={toast.message} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
      <DeleteConfirmModal />
    </>
  );
};

export default CustomerCart;
