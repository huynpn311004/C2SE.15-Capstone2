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

function requireDelivery() {
  const role = getUserRole()
  if (role !== 'delivery_partner') {
    throw new Error('Tai khoan khong phai la nguoi giao hang')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

// Lấy danh sách đơn giao hàng đang hoạt động của delivery partner
export async function fetchDeliveryOrders() {
  requireDelivery()
  const response = await API.get('/delivery/orders')
  return response.data
}

// Lấy đơn hàng đang giao (assigned, picking_up, delivering)
export async function fetchActiveDeliveries() {
  requireDelivery()
  const response = await API.get('/delivery/orders/active')
  return response.data
}

// Lấy lịch sử giao hàng đã hoàn thành
export async function fetchDeliveryHistory(filter = 'all') {
  requireDelivery()
  const params = {}
  if (filter !== 'all') params.filter = filter
  const response = await API.get('/delivery/history', { params })
  return response.data
}

// Cập nhật trạng thái giao hàng
export async function updateDeliveryStatus(deliveryId, newStatus) {
  requireDelivery()
  const response = await API.put(
    `/delivery/orders/${deliveryId}/status`,null,{ params: { status: newStatus } }
  )
  return response.data
}

// Lấy chi tiết một đơn giao hàng
export async function fetchDeliveryDetail(deliveryId) {
  requireDelivery()
  const response = await API.get(`/delivery/orders/${deliveryId}`)
  return response.data
}

// Lấy thông tin profile delivery partner
export async function fetchDeliveryProfile() {
  requireDelivery()
  const response = await API.get('/delivery/profile')
  return response.data
}

// Cập nhật profile delivery partner
export async function updateDeliveryProfile(payload) {
  requireDelivery()
  const response = await API.put('/delivery/profile', payload)
  return response.data
}

// Lấy thống kê delivery partner
export async function fetchDeliveryStats() {
  requireDelivery()
  const response = await API.get('/delivery/stats')
  return response.data
}

// Đổi mật khẩu delivery partner
export async function changeDeliveryPassword(payload) {
  requireDelivery()
  const response = await API.post('/delivery/change-password', payload)
  return response.data
}

// ========== DONATION DELIVERIES ==========

// Lấy danh sách tất cả đơn giao quyên góp
export async function fetchDonationDeliveries() {
  requireDelivery()
  const response = await API.get('/delivery/donations')
  return response.data
}

// Lấy đơn giao quyên góp đang hoạt động (assigned, picking_up, delivering)
export async function fetchActiveDonationDeliveries() {
  requireDelivery()
  const response = await API.get('/delivery/donations/active')
  return response.data
}

// Lấy lịch sử giao quyên góp đã hoàn thành
export async function fetchDonationDeliveryHistory(filter = 'all') {
  requireDelivery()
  const params = {}
  if (filter !== 'all') params.filter = filter
  const response = await API.get('/delivery/donations/history', { params })
  return response.data
}

// Lấy chi tiết một đơn giao quyên góp
export async function fetchDonationDeliveryDetail(deliveryId) {
  requireDelivery()
  const response = await API.get(`/delivery/donations/${deliveryId}`)
  return response.data
}

// Cập nhật trạng thái giao quyên góp (dùng endpoint chung)
export async function updateDonationDeliveryStatus(deliveryId, newStatus) {
  requireDelivery()
  const response = await API.put(
    `/delivery/orders/${deliveryId}/status`,
    null,
    { params: { status: newStatus } }
  )
  return response.data
}
