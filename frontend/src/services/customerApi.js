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

// Profile APIs
export async function fetchCustomerProfile() {
  const userId = requireCustomer()
  const response = await API.get('/customer/profile', {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateCustomerProfile(payload) {
  const userId = requireCustomer()
  const response = await API.put('/customer/profile', payload, {
    params: { user_id: userId },
  })
  return response.data
}

// Products APIs
export async function fetchCustomerProducts({ supermarketId, categoryId, search } = {}) {
  const params = {}
  if (supermarketId) params.supermarket_id = supermarketId
  if (categoryId) params.category_id = categoryId
  if (search) params.search = search

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

// Categories & Supermarkets APIs
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

// Orders APIs
export async function fetchCustomerOrders(statusFilter = 'all') {
  const userId = requireCustomer()
  const params = { user_id: userId }
  if (statusFilter !== 'all') params.status_filter = statusFilter

  const response = await API.get('/customer/orders', { params })
  return response.data.items || []
}

export async function fetchCustomerOrderDetail(orderId) {
  const userId = requireCustomer()
  const response = await API.get(`/customer/orders/${orderId}`, {
    params: { user_id: userId },
  })
  return response.data
}

export async function createCustomerOrder(payload) {
  const userId = requireCustomer()
  const response = await API.post('/customer/orders', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function cancelCustomerOrder(orderId) {
  const userId = requireCustomer()
  const response = await API.put(`/customer/orders/${orderId}/cancel`, {}, {
    params: { user_id: userId },
  })
  return response.data
}

// Dashboard
export async function fetchCustomerDashboardSummary() {
  const userId = requireCustomer()
  const response = await API.get('/customer/dashboard-summary', {
    params: { user_id: userId },
  })
  return response.data
}

// Helpers
export { getUserId, getUserRole }
