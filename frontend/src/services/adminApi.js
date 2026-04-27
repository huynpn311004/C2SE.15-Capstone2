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

function requireAdmin() {
  const role = getUserRole()
  if (role !== 'system_admin') {
    throw new Error('Tai khoan khong phai la quan tri he thong')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

export async function fetchAdminDashboardSummary() {
  requireAdmin()
  const response = await API.get('/admin/dashboard-summary')
  return response.data
}

export async function fetchAdminReports(range = '30d') {
  requireAdmin()
  const response = await API.get('/admin/reports', { params: { range } })
  return response.data
}

export async function fetchAdminUsers() {
  requireAdmin()
  const response = await API.get('/admin/users')
  return response.data.items || []
}

export async function toggleAdminUserLock(userId) {
  requireAdmin()
  await API.patch(`/admin/users/${userId}/toggle-lock`)
}

export async function updateAdminUser(userId, payload) {
  requireAdmin()
  await API.put(`/admin/users/${userId}`, payload)
}

export async function changeAdminUserPassword(userId, payload) {
  requireAdmin()
  await API.post(`/admin/users/${userId}/change-password`, payload)
}

export async function deleteAdminUser(userId) {
  requireAdmin()
  await API.delete(`/admin/users/${userId}`)
}

export async function fetchAdminSupermarkets() {
  requireAdmin()
  const response = await API.get('/admin/supermarkets')
  return response.data.items || []
}

export async function updateAdminSupermarket(supermarketId, payload) {
  requireAdmin()
  await API.put(`/admin/supermarkets/${supermarketId}`, payload)
}

export async function createAdminSupermarketAccount(supermarketId, payload) {
  requireAdmin()
  await API.post(`/admin/supermarkets/${supermarketId}/create-account`, payload)
}

export async function createAdminSupermarketWithAccount(payload) {
  requireAdmin()
  await API.post('/admin/supermarkets/create-account', payload)
}

export async function toggleAdminSupermarketLock(supermarketId) {
  requireAdmin()
  await API.patch(`/admin/supermarkets/${supermarketId}/toggle-lock`)
}

export async function deleteAdminSupermarket(supermarketId) {
  requireAdmin()
  await API.delete(`/admin/supermarkets/${supermarketId}`)
}

export async function fetchAdminCharities() {
  requireAdmin()
  const response = await API.get('/admin/charities')
  return response.data.items || []
}

export async function updateAdminCharity(charityId, payload) {
  requireAdmin()
  await API.put(`/admin/charities/${charityId}`, payload)
}

export async function createAdminCharityAccount(charityId, payload) {
  requireAdmin()
  await API.post(`/admin/charities/${charityId}/create-account`, payload)
}

export async function createAdminCharityWithAccount(payload) {
  requireAdmin()
  await API.post('/admin/charities/create-account', payload)
}

export async function toggleAdminCharityLock(charityId) {
  requireAdmin()
  await API.patch(`/admin/charities/${charityId}/toggle-lock`)
}

export async function deleteAdminCharity(charityId) {
  requireAdmin()
  await API.delete(`/admin/charities/${charityId}`)
}

export async function fetchAdminDeliveryPartners() {
  requireAdmin()
  const response = await API.get('/admin/deliveries')
  return response.data.items || []
}

export async function updateAdminDeliveryPartner(deliveryId, payload) {
  requireAdmin()
  await API.put(`/admin/deliveries/${deliveryId}`, payload)
}

export async function createAdminDeliveryAccount(deliveryId, payload) {
  requireAdmin()
  await API.post(`/admin/deliveries/${deliveryId}/create-account`, payload)
}

export async function createAdminDeliveryWithAccount(payload) {
  requireAdmin()
  await API.post('/admin/deliveries/create-account', payload)
}

export async function toggleAdminDeliveryLock(deliveryId) {
  requireAdmin()
  await API.patch(`/admin/deliveries/${deliveryId}/toggle-lock`)
}

export async function deleteAdminDeliveryPartner(deliveryId) {
  requireAdmin()
  await API.delete(`/admin/deliveries/${deliveryId}`)
}
