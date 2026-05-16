import API from './api'

function getUserId() {
  try {
    const raw = localStorage.getItem('seims_auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id || null
  } catch {
    return null
  }
}

function getUserRole() {
  try {
    const raw = localStorage.getItem('seims_auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.role || null
  } catch {
    return null
  }
}

function requireCustomer() {
  const role = getUserRole()
  if (role !== 'customer') {
    throw new Error('Tai khoan khong phai la khach hang')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

// Setting APIs
export async function fetchCustomerSetting() {
  requireCustomer()
  const response = await API.get('/customer/profile')
  return response.data
}

export async function updateCustomerSetting(payload) {
  requireCustomer()
  const response = await API.put('/customer/profile', payload)
  return response.data
}

export async function changeCustomerPassword(payload) {
  requireCustomer()
  const response = await API.post('/customer/change-password', payload)
  return response.data
}

export async function depositToWallet(amount) {
  requireCustomer()
  const response = await API.post('/customer/wallet/deposit', { amount })
  return response.data
}

export async function fetchWalletHistory() {
  requireCustomer()
  const response = await API.get('/customer/wallet/history')
  return response.data
}

// Products APIs
// KHONG can dang nhap - moi nguoi deu xem duoc san pham
export async function fetchCustomerProducts({ supermarketId, storeId, categoryId, search, latitude, longitude } = {}) {
  const params = {}
  if (supermarketId) params.supermarket_id = supermarketId
  if (storeId) params.store_id = storeId
  if (categoryId) params.category_id = categoryId
  if (search) params.search = search
  if (latitude != null) params.latitude = latitude
  if (longitude != null) params.longitude = longitude

  const response = await API.get('/customer/products', { params })
  return response.data.items || []
}

export async function fetchCustomerProductDetail(productId) {
  const response = await API.get(`/customer/products/${productId}`)
  return response.data
}

export async function fetchNearExpiryProducts({ supermarketId, maxDays = 7 } = {}) {
  const params = { max_days: maxDays }
  if (supermarketId) params.supermarket_id = supermarketId

  const response = await API.get('/customer/near-expiry-products', { params })
  return response.data.items || []
}

// Categories & Supermarkets APIs - KHONG can dang nhap
export async function fetchCustomerCategories(supermarketId) {
  const params = {}
  if (supermarketId) params.supermarket_id = supermarketId

  const response = await API.get('/customer/categories', { params })
  return response.data.items || []
}

export async function fetchCustomerSupermarkets() {
  const response = await API.get('/customer/supermarkets')
  return response.data.items || []
}

export async function fetchCustomerStores({ latitude, longitude } = {}) {
  const params = {}
  if (latitude != null) params.latitude = latitude
  if (longitude != null) params.longitude = longitude

  const response = await API.get('/customer/stores', { params })
  return response.data.items || []
}

// Orders APIs
export async function fetchCustomerOrders(statusFilter = 'all') {
  requireCustomer()
  const params = {}
  if (statusFilter !== 'all') params.status_filter = statusFilter

  const response = await API.get('/customer/orders', { params })
  return response.data.items || []
}

export async function fetchCustomerOrderDetail(orderId) {
  requireCustomer()
  const response = await API.get(`/customer/orders/${orderId}`)
  return response.data
}

export async function createCustomerOrder(payload) {
  requireCustomer()
  const response = await API.post('/customer/orders', payload)
  return response.data
}

// Multi-store order - creates separate orders per store
export async function createMultiStoreOrder(payload) {
  requireCustomer()
  const response = await API.post('/customer/orders/multi-store', payload)
  return response.data
}

// Cart validation - check stock availability before adding to cart
export async function validateCartStock(items) {
  requireCustomer()
  const response = await API.post('/customer/cart/validate', { items })
  return response.data
}

export async function cancelCustomerOrder(orderId) {
  requireCustomer()
  const response = await API.put(`/customer/orders/${orderId}/cancel`)
  return response.data
}

export async function confirmCustomerOrder(orderId, paymentMethod = 'cod') {
  requireCustomer()
  const response = await API.put(`/customer/orders/${orderId}/confirm-payment`, { paymentMethod })
  return response.data
}

// Payment APIs
export async function initiatePayment(orderId, paymentMethod = 'vnpay') {
  requireCustomer()
  // Nếu là list (đa cửa hàng), lấy ID đầu tiên làm lead ID cho URL
  const leadId = Array.isArray(orderId) ? orderId[0] : orderId
  const payload = { order_id: orderId, payment_method: paymentMethod }
  const response = await API.post(`/payment/orders/${leadId}/pay`, payload)
  return response.data
}

// Dashboard
export async function fetchCustomerDashboardSummary() {
  requireCustomer()
  const response = await API.get('/customer/dashboard-summary')
  return response.data
}

// Coupons
export async function fetchAvailableCoupons() {
  requireCustomer()
  const response = await API.get('/customer/coupons')
  return response.data.items || []
}

// Shipping Estimation
export async function estimateShipping(storeId, address, orderAmount = 0) {
  requireCustomer()
  const response = await API.post('/customer/estimate-shipping', {
    storeId,
    address,
    orderAmount,
  })
  return response.data
}

// Helpers
export { getUserId, getUserRole }
