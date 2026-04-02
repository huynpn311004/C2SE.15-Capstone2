import API from './api'
import { useAuth } from './AuthContext'

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

export async function fetchStaffDashboardSummary() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/dashboard-summary', {
    params: { user_id: userId },
  })
  return response.data
}

export async function fetchStaffProfile() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/profile', {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateStaffProfile(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put('/staff/profile', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function changeStaffPassword(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.post('/staff/change-password', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function fetchInventoryLots(statusFilter = 'all') {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/inventory-lots', {
    params: { user_id: userId, status_filter: statusFilter },
  })
  return response.data.items || []
}

export async function createInventoryLot(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.post('/staff/inventory-lots', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateInventoryLot(lotId, payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(`/staff/inventory-lots/${lotId}`, payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function deleteInventoryLot(lotId) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.delete(`/staff/inventory-lots/${lotId}`, {
    params: { user_id: userId },
  })
  return response.data
}

export async function importInventoryLots(file) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const formData = new FormData()
  formData.append('file', file)

  const response = await API.post('/staff/inventory-lots/import-excel', formData, {
    params: { user_id: userId },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchStaffOrders() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/orders', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function updateOrderStatus(orderId, newStatus) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(
    `/staff/orders/${orderId}/status`,
    { status: newStatus },
    { params: { user_id: userId } }
  )
  return response.data
}

export async function fetchNotifications() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/notifications', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function markNotificationRead(notificationId) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(
    `/staff/notifications/${notificationId}/read`,
    {},
    { params: { user_id: userId } }
  )
  return response.data
}

export async function fetchCategoryStats() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/category-stats', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function fetchDonationOffers() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/donation-offers', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function createDonationOffer(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.post('/staff/donation-offers', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateDonationOfferStatus(offerId, newStatus) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(
    `/staff/donation-offers/${offerId}/status`,
    { status: newStatus },
    { params: { user_id: userId } }
  )
  return response.data
}

export async function fetchCategories() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/categories', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function createCategory(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.post('/staff/categories', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateCategory(categoryId, payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(`/staff/categories/${categoryId}`, payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function deleteCategory(categoryId) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.delete(`/staff/categories/${categoryId}`, {
    params: { user_id: userId },
  })
  return response.data
}

// Products API
export async function fetchProducts(categoryFilter = null, search = '') {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const params = { user_id: userId }
  if (categoryFilter) params.category_filter = categoryFilter
  if (search) params.search = search

  const response = await API.get('/staff/products', { params })
  return response.data.items || []
}

export async function fetchProductCategories() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/products/categories', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function createProduct(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.post('/staff/products', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateProduct(productId, payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(`/staff/products/${productId}`, payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function deleteProduct(productId) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.delete(`/staff/products/${productId}`, {
    params: { user_id: userId },
  })
  return response.data
}

export async function importProducts(file) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const formData = new FormData()
  formData.append('file', file)

  const response = await API.post('/staff/products/import-excel', formData, {
    params: { user_id: userId },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchDonationRequests() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/staff/donation-requests', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function updateDonationRequestStatus(requestId, newStatus) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(
    `/staff/donation-requests/${requestId}/status`,
    { status: newStatus },
    { params: { user_id: userId } }
  )
  return response.data
}
