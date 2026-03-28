import API from './api'

export async function fetchAdminDashboardSummary() {
  const response = await API.get('/admin/dashboard-summary')
  return response.data
}

export async function fetchAdminReports(range = '30d') {
  const response = await API.get('/admin/reports', { params: { range } })
  return response.data
}

export async function fetchAdminAuditLogs(params = {}) {
  const response = await API.get('/admin/audit-logs', { params })
  return response.data.items || []
}

export async function fetchAdminUsers() {
  const response = await API.get('/admin/users')
  return response.data.items || []
}

export async function toggleAdminUserLock(userId) {
  await API.patch(`/admin/users/${userId}/toggle-lock`)
}

export async function updateAdminUser(userId, payload) {
  await API.put(`/admin/users/${userId}`, payload)
}

export async function changeAdminUserPassword(userId, payload) {
  await API.post(`/admin/users/${userId}/change-password`, payload)
}

export async function deleteAdminUser(userId) {
  await API.delete(`/admin/users/${userId}`)
}

export async function fetchAdminSupermarkets() {
  const response = await API.get('/admin/supermarkets')
  return response.data.items || []
}

export async function updateAdminSupermarket(supermarketId, payload) {
  await API.put(`/admin/supermarkets/${supermarketId}`, payload)
}

export async function createAdminSupermarketAccount(supermarketId, payload) {
  await API.post(`/admin/supermarkets/${supermarketId}/create-account`, payload)
}

export async function createAdminSupermarketWithAccount(payload) {
  await API.post('/admin/supermarkets/create-account', payload)
}

export async function toggleAdminSupermarketLock(supermarketId) {
  await API.patch(`/admin/supermarkets/${supermarketId}/toggle-lock`)
}

export async function deleteAdminSupermarket(supermarketId) {
  await API.delete(`/admin/supermarkets/${supermarketId}`)
}

export async function fetchAdminCharities() {
  const response = await API.get('/admin/charities')
  return response.data.items || []
}

export async function updateAdminCharity(charityId, payload) {
  await API.put(`/admin/charities/${charityId}`, payload)
}

export async function createAdminCharityAccount(charityId, payload) {
  await API.post(`/admin/charities/${charityId}/create-account`, payload)
}

export async function createAdminCharityWithAccount(payload) {
  await API.post('/admin/charities/create-account', payload)
}

export async function toggleAdminCharityLock(charityId) {
  await API.patch(`/admin/charities/${charityId}/toggle-lock`)
}

export async function deleteAdminCharity(charityId) {
  await API.delete(`/admin/charities/${charityId}`)
}

export async function fetchAdminDeliveryPartners() {
  const response = await API.get('/admin/deliveries')
  return response.data.items || []
}

export async function updateAdminDeliveryPartner(deliveryId, payload) {
  await API.put(`/admin/deliveries/${deliveryId}`, payload)
}

export async function createAdminDeliveryAccount(deliveryId, payload) {
  await API.post(`/admin/deliveries/${deliveryId}/create-account`, payload)
}

export async function createAdminDeliveryWithAccount(payload) {
  await API.post('/admin/deliveries/create-account', payload)
}

export async function toggleAdminDeliveryLock(deliveryId) {
  await API.patch(`/admin/deliveries/${deliveryId}/toggle-lock`)
}

export async function deleteAdminDeliveryPartner(deliveryId) {
  await API.delete(`/admin/deliveries/${deliveryId}`)
}
