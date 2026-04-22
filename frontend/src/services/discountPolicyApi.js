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

function requireSupermarketAdmin() {
  const role = getUserRole()
  if (role !== 'supermarket_admin') {
    throw new Error('Chi co Quan Ly Siêu Thị moi co quyen truy cap chuc nang nay')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

// List all discount policies (Supermarket Admin chỉ thấy của siêu thị mình)
export async function fetchDiscountPolicies() {
  requireSupermarketAdmin()
  const response = await API.get('/discount-policy')
  return response.data.items || []
}

// Get single policy
export async function fetchDiscountPolicy(policyId) {
  requireSupermarketAdmin()
  const response = await API.get(`/discount-policy/${policyId}`)
  return response.data
}

// Create policy (Chi Supermarket Admin)
export async function createDiscountPolicy(payload) {
  requireSupermarketAdmin()
  const params = {
    name: payload.name,
    min_days: payload.minDaysLeft,
    max_days: payload.maxDaysLeft,
    discount: payload.discountPercent,
  }
  if (payload.categoryId) params.category_id = payload.categoryId
  if (payload.productId) params.product_id = payload.productId

  const response = await API.post('/discount-policy', null, { params })
  return response.data
}

// Update policy (Chi Supermarket Admin)
export async function updateDiscountPolicy(policyId, payload) {
  requireSupermarketAdmin()
  const params = {}
  if (payload.name) params.name = payload.name
  if (payload.minDaysLeft !== undefined) params.min_days = payload.minDaysLeft
  if (payload.maxDaysLeft !== undefined) params.max_days = payload.maxDaysLeft
  if (payload.discountPercent !== undefined) params.discount = payload.discountPercent
  if (payload.categoryId !== undefined) params.category_id = payload.categoryId
  if (payload.productId !== undefined) params.product_id = payload.productId

  const response = await API.put(`/discount-policy/${policyId}`, null, { params })
  return response.data
}

// Delete policy (Chi Supermarket Admin)
export async function deleteDiscountPolicy(policyId) {
  requireSupermarketAdmin()
  const response = await API.delete(`/discount-policy/${policyId}`)
  return response.data
}

// Toggle policy active/inactive (Chi Supermarket Admin)
export async function toggleDiscountPolicy(policyId) {
  requireSupermarketAdmin()
  const response = await API.patch(`/discount-policy/${policyId}/toggle`)
  return response.data
}

// Calculate discount for a given price and expiry date (Ai cung dung duoc)
export async function calculateDiscount(basePrice, expiryDate, supermarketId, productId) {
  const params = {
    base_price: basePrice,
    expiry_date: expiryDate,
  }
  if (supermarketId) params.supermarket_id = supermarketId
  if (productId) params.product_id = productId

  const response = await API.get('/discount-policy/calculate', { params })
  return response.data
}

