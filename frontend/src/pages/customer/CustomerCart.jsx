import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductImageUrl } from '../../services/staffApi';
import { validateCartStock, fetchCustomerProductDetail } from '../../services/customerApi';
import './CustomerCart.css';

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

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function updateCartItemQuantity(productId, delta, onDelete) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);

  if (!item) return;

  // If decreasing and quantity is 1, ask to delete
  if (delta < 0 && item.quantity <= 1) {
    if (onDelete) {
      onDelete(productId);
    }
    return;
  }

  const updatedCart = cart.map(cartItem => {
    if (cartItem.id === productId) {
      const newQty = Math.max(1, cartItem.quantity + delta);
      return { ...cartItem, quantity: newQty };
    }
    return cartItem;
  });
  saveCart(updatedCart);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div className="cart-toast">
      {message}
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

  // Initialize selected items when cart is loaded
  useEffect(() => {
    if (cart.length > 0 && Object.keys(selectedItems).length === 0) {
      const initial = {};
      cart.forEach(item => { initial[item.id] = true; });
      setSelectedItems(initial);
    }
  }, [cart.length]);

  // Toggle select single item
  const toggleSelectItem = (productId) => {
    setSelectedItems(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  // Select all items in a store
  const toggleSelectStore = (storeId, items) => {
    const allSelected = items.every(item => selectedItems[item.id]);
    setSelectedItems(prev => {
      const updated = { ...prev };
      items.forEach(item => { updated[item.id] = !allSelected; });
      return updated;
    });
  };

  // Select/deselect all items
  const toggleSelectAll = () => {
    const allSelected = cart.length > 0 && cart.every(item => selectedItems[item.id]);
    const updated = {};
    cart.forEach(item => { updated[item.id] = !allSelected; });
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
          setCart(stored);
          // Initialize selected items
          const initial = {};
          stored.forEach(item => { initial[item.id] = true; });
          setSelectedItems(initial);
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
              };
            }
          });
        } catch (err) {
          console.warn('Failed to fetch fresh prices, using cached prices');
        }

        if (!isMounted) return;

        // Merge fresh prices with cart items
        const updatedCart = stored.map(item => {
          const fresh = freshPricesMap[item.id];
          if (fresh) {
            return {
              ...item,
              salePrice: fresh.salePrice,
              originalPrice: fresh.originalPrice,
              discount: fresh.discount,
              daysLeft: fresh.daysLeft,
            };
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
        setCart(stored);
        // Also reset selected items
        const initial = {};
        stored.forEach(item => { initial[item.id] = true; });
        setSelectedItems(initial);
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

      // Validate all selected cart items stock before checkout
      const validationItems = selectedCartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        storeId: item.storeId || item.store_id
      }));

      const validation = await validateCartStock(validationItems);

      if (!validation.valid) {
        const outOfStock = validation.outOfStockItems.join('\n• ');
        showToast(`⚠️ Một số sản phẩm hết hàng:\n• ${outOfStock}`);
        setIsProcessing(false);
        return;
      }

      // Group selected cart items by storeId for display
      const storeGroups = {};
      selectedCartItems.forEach(item => {
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

      // Prepare items for checkout (orders will be created AFTER user confirms address)
      const items = selectedCartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        lotCode: item.lotCode || null,
        storeId: item.storeId || item.store_id,
      }));

      // Navigate to checkout page WITHOUT creating orders yet
      // Orders will be created in checkout form submission with user-entered address
      showToast('✅ Kiểm tra hàng thành công! Vui lòng điền địa chỉ giao hàng.');

      setTimeout(() => {
        navigate('/customer/checkout', {
          state: {
            cartItems: selectedCartItems,
            itemsForOrder: items,
            isMultiStore: true,
            totalAmount: subtotal,
          }
        });
      }, 1500);

    } catch (err) {
      console.error('Failed to reserve:', err);
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
  const selectedCartItems = cart.filter(item => selectedItems[item.id]);

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
            <div>
              <h3 className="cart-section-title">Danh sách sản phẩm</h3>
              <p className="cart-section-subtitle">{cart.length} sản phẩm trong giỏ hàng</p>
              {groupList.length > 1 && (
                <p className="cart-section-subtitle" style={{ color: 'var(--seims-info)' }}>
                  Từ {groupList.length} cửa hàng khác nhau
                </p>
              )}
            </div>
            {cart.length > 0 && (
              <button className="cart-clear-btn" onClick={handleClearCart}>
                🗑 Xóa tất cả
              </button>
            )}
            {cart.length > 0 && (
              <label className="cart-select-all" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cart.length > 0 && cart.every(item => selectedItems[item.id])}
                  onChange={toggleSelectAll}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                />
                <span>Chọn tất cả</span>
              </label>
            )}
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
                        checked={group.items.every(item => selectedItems[item.id])}
                        onChange={() => toggleSelectStore(group.storeId, group.items)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--seims-teal)' }}
                      />
                    </label>
                    <span className="cart-store-icon">🏪</span>
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
                    <div key={item.id} className={`cart-item ${!selectedItems[item.id] ? 'cart-item-unselected' : ''}`}>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedItems[item.id]}
                          onChange={() => toggleSelectItem(item.id)}
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
                        🗑
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
                <div>
                  <h3 className="cart-section-title">Tóm tắt đơn hàng</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--seims-muted)' }}>
                    {selectedCount} sản phẩm đã chọn
                  </p>
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

                <div style={{ borderTop: '1px solid var(--seims-border)', margin: '0.75rem 0' }} />

                <div className="cart-summary-row">
                  <span className="cart-summary-label">Tạm tính</span>
                  <span className="cart-summary-value">{subtotal.toLocaleString()}đ</span>
                </div>
                <div className="cart-summary-row">
                  <span className="cart-summary-label">Phí vận chuyển</span>
                  <span className="cart-summary-value" style={{ color: 'var(--seims-success)' }}>Miễn phí</span>
                </div>
                <div className="cart-summary-savings">
                  <span className="cart-summary-label">Tiết kiệm</span>
                  <span className="cart-summary-value" style={{ color: 'var(--seims-warning)' }}>
                    -{totalSavings.toLocaleString()}đ
                  </span>
                </div>

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
                  {isProcessing ? '⏳ Đang xử lý...' : 'Thanh toán ngay'}
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

    <Toast visible={toast.visible} message={toast.message} />
    <DeleteConfirmModal />
    </>
  );
};

export default CustomerCart;
