import API from './api'

function getImageBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
  return baseUrl.replace(/\/api\/?$/, '')
}

function getProductImageUrl(imageUrl) {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${getImageBaseUrl()}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

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

export { getProductImageUrl }

function requireStaff() {
  const role = getUserRole()
  if (role !== 'store_staff') {
    throw new Error('Tai khoan khong co quyen truy cap')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

export async function fetchStaffDashboardSummary() {
  requireStaff()
  const response = await API.get('/staff/dashboard-summary')
  return response.data
}

export async function fetchStaffProfile() {
  requireStaff()
  const response = await API.get('/staff/profile')
  return response.data
}

export async function updateStaffProfile(payload) {
  requireStaff()
  const response = await API.put('/staff/profile', payload)
  return response.data
}

export async function changeStaffPassword(payload) {
  requireStaff()
  const response = await API.post('/staff/change-password', payload)
  return response.data
}

export async function fetchInventoryLots(statusFilter = 'all') {
  requireStaff()
  const params = {}
  if (statusFilter !== 'all') params.status_filter = statusFilter

  const response = await API.get('/staff/inventory-lots', { params })
  return response.data.items || []
}

export async function createInventoryLot(payload) {
  requireStaff()
  const response = await API.post('/staff/inventory-lots', payload)
  return response.data
}

export async function updateInventoryLot(lotId, payload) {
  requireStaff()
  const response = await API.put(`/staff/inventory-lots/${lotId}`, payload)
  return response.data
}

export async function deleteInventoryLot(lotId) {
  requireStaff()
  const response = await API.delete(`/staff/inventory-lots/${lotId}`)
  return response.data
}

export async function importInventoryLots(file) {
  requireStaff()
  const formData = new FormData()
  formData.append('file', file)

  const response = await API.post('/staff/inventory-lots/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchStaffOrders() {
  requireStaff()
  const response = await API.get('/staff/orders')
  return response.data.items || []
}

export async function fetchDashboardAlerts() {
  requireStaff()
  const response = await API.get('/staff/inventory-lots')
  return response.data.items || []
}

export async function updateOrderStatus(orderId, newStatus) {
  requireStaff()
  const response = await API.put(
    `/staff/orders/${orderId}/status`,
    { status: newStatus }
  )
  return response.data
}

export async function fetchOrderDetail(orderId) {
  requireStaff()
  const response = await API.get(`/staff/orders/${orderId}`)
  return response.data
}

export async function fetchNotifications() {
  requireStaff()
  const response = await API.get('/staff/notifications')
  return response.data.items || []
}

export async function markNotificationRead(notificationId) {
  requireStaff()
  const response = await API.put(
    `/staff/notifications/${notificationId}/read`
  )
  return response.data
}

export async function fetchCategoryStats() {
  requireStaff()
  const response = await API.get('/staff/category-stats')
  return response.data.items || []
}

export async function fetchDonationOffers() {
  requireStaff()
  const response = await API.get('/staff/donation-offers')
  return response.data.items || []
}

export async function fetchInventoryLotsForDonation() {
  requireStaff()
  const response = await API.get('/staff/inventory-lots', {
    params: { status_filter: 'all' },
  })
  return response.data.items || []
}

export async function createDonationOffer(payload) {
  requireStaff()
  const response = await API.post('/staff/donation-offers', null, {
    params: {
      lot_id: payload.lotId,
      offered_qty: payload.offeredQty,
    },
  })
  return response.data
}

export async function createBulkDonationOffers(items) {
  requireStaff()
  const response = await API.post('/staff/donation-offers/bulk', items)
  return response.data
}

export async function updateDonationOfferStatus(offerId, newStatus) {
  requireStaff()
  const response = await API.put(
    `/staff/donation-offers/${offerId}/status`,
    { status: newStatus }
  )
  return response.data
}

export async function fetchCategories() {
  requireStaff()
  const response = await API.get('/staff/categories')
  return response.data.items || []
}

export async function createCategory(payload) {
  requireStaff()
  const response = await API.post('/staff/categories', payload)
  return response.data
}

export async function updateCategory(categoryId, payload) {
  requireStaff()
  const response = await API.put(`/staff/categories/${categoryId}`, payload)
  return response.data
}

export async function deleteCategory(categoryId) {
  requireStaff()
  const response = await API.delete(`/staff/categories/${categoryId}`)
  return response.data
}

// Products API
export async function fetchProducts(categoryFilter = null, search = '') {
  requireStaff()
  const params = {}
  if (categoryFilter) params.category_filter = categoryFilter
  if (search) params.search = search

  const response = await API.get('/staff/products', { params })
  return response.data.items || []
}

export async function fetchProductCategories() {
  requireStaff()
  const response = await API.get('/staff/products/categories')
  return response.data.items || []
}

export async function uploadProductImage(file) {
  requireStaff()
  const formData = new FormData()
  formData.append('file', file)

  const response = await API.post('/staff/upload-product-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.image_url || response.data.url || response.data
}

export async function createProduct(payload) {
  requireStaff()
  const response = await API.post('/staff/products', payload)
  return response.data
}

export async function updateProduct(productId, payload) {
  requireStaff()
  const response = await API.put(`/staff/products/${productId}`, payload)
  return response.data
}

export async function deleteProduct(productId) {
  requireStaff()
  const response = await API.delete(`/staff/products/${productId}`)
  return response.data
}

export async function importProducts(file) {
  requireStaff()
  const formData = new FormData()
  formData.append('file', file)

  const response = await API.post('/staff/products/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function fetchDonationRequests() {
  requireStaff()
  const response = await API.get('/staff/donation-requests')
  return response.data.items || []
}

export async function updateDonationRequestStatus(requestId, newStatus) {
  requireStaff()
  const response = await API.put(
    `/staff/donation-requests/${requestId}/status`,
    { status: newStatus }
  )
  return response.data
}
