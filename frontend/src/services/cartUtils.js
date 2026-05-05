const CART_PREFIX = 'seims_customer_cart_';

function getUserId() {
  try {
    const raw = localStorage.getItem('seims_auth_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id || null;
  } catch {
    return null;
  }
}

function getCartKey() {
  const userId = getUserId();
  if (!userId) throw new Error('Người dùng chưa đăng nhập');
  return CART_PREFIX + userId;
}

export function getCart() {
  try {
    const key = getCartKey();
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCart(cart) {
  const key = getCartKey();
  localStorage.setItem(key, JSON.stringify(cart));
  window.dispatchEvent(new Event('seims-cart-updated'));
}

export function clearCart() {
  const key = getCartKey();
  localStorage.removeItem(key);
  window.dispatchEvent(new Event('seims-cart-updated'));
}

export function addToCart(product) {
  const cart = getCart();
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
  setCart(cart);
}

export function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  setCart(cart);
}

export function updateCartItemQuantity(productId, delta, onDelete) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);

  if (!item) return;

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
  setCart(updatedCart);
}
