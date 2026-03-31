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
  const userId = requireSupermarketAdmin()
  const response = await API.get('/discount-policy', { params: { user_id: userId } })
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
  const userId = requireSupermarketAdmin()
  const response = await API.post('/discount-policy', payload, {
    params: { user_id: userId },
  })
  return response.data
}

// Update policy (Chi Supermarket Admin)
export async function updateDiscountPolicy(policyId, payload) {
  const userId = requireSupermarketAdmin()
  const response = await API.put(`/discount-policy/${policyId}`, payload, {
    params: { user_id: userId },
  })
  return response.data
}

// Delete policy (Chi Supermarket Admin)
export async function deleteDiscountPolicy(policyId) {
  const userId = requireSupermarketAdmin()
  const response = await API.delete(`/discount-policy/${policyId}`, {
    params: { user_id: userId },
  })
  return response.data
}

// Toggle policy active/inactive (Chi Supermarket Admin)
export async function toggleDiscountPolicy(policyId) {
  const userId = requireSupermarketAdmin()
  const response = await API.patch(`/discount-policy/${policyId}/toggle`, {}, {
    params: { user_id: userId },
  })
  return response.data
}

// Calculate discount for a given price and expiry date (Ai cung dung duoc)
export async function calculateDiscount(basePrice, expiryDate, supermarketId) {
  const params = {
    base_price: basePrice,
    expiry_date: expiryDate,
  }
  if (supermarketId) params.supermarket_id = supermarketId

  const response = await API.get('/discount-policy/calculate', { params })
  return response.data
}

// Helpers
export { getUserId, getUserRole }
