import API from './api'
import {
  fetchAdminReports,
  fetchAdminSupermarkets,
  fetchAdminUsers,
  toggleAdminUserLock,
  updateAdminUser,
  deleteAdminUser,
} from './adminApi'

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
    throw new Error('Tai khoan khong phai la quan ly sieu thi')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchSupermarketDashboardData() {
  const userId = requireSupermarketAdmin()
  const [stores, reports, users] = await Promise.all([
    fetchSupermarketStores(),
    fetchAdminReports('30d'),
    fetchAdminUsers(),
  ])

  const staff = users.filter((item) => (item.role || '').toLowerCase() === 'store staff')

  return {
    stats: {
      stores: stores.length,
      staff: staff.length,
      pending: 0,
      nearExpiry: Math.max(0, toNumber(reports?.metrics?.orders) || 0),
    },
    storePerformance: (reports?.supermarketTop || []).map((item) => ({
      name: item.name || '-',
      orders: Number(item.orders || 0),
      revenue: item.growth || 'N/A',
      status: Number(item.orders || 0) > 0 ? 'active' : 'warning',
    })),
    recentDonations: [],
  }
}

export async function fetchSupermarketStores() {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/stores')
  return response.data.items || []
}

export async function saveSupermarketStore(storeId, payload) {
  requireSupermarketAdmin()
  await API.put(`/supermarket-admin/stores/${storeId}`, payload)
}

export async function createSupermarketStore(payload) {
  requireSupermarketAdmin()
  await API.post('/supermarket-admin/stores', payload)
}

export async function removeSupermarketStore(storeId) {
  requireSupermarketAdmin()
  await API.delete(`/supermarket-admin/stores/${storeId}`)
}

export async function fetchSupermarketStaff() {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/staff')
  return response.data.items || []
}

export async function saveSupermarketStaff(userId, payload) {
  requireSupermarketAdmin()
  await API.put(`/supermarket-admin/staff/${userId}`, payload)
}

export async function toggleSupermarketStaffLock(userId) {
  requireSupermarketAdmin()
  await API.patch(`/supermarket-admin/staff/${userId}/toggle-lock`)
}

export async function removeSupermarketStaff(userId) {
  requireSupermarketAdmin()
  await API.delete(`/supermarket-admin/staff/${userId}`)
}

export async function createSupermarketStaff(payload) {
  const response = await API.post('/auth/register', {
    username: payload.username,
    email: payload.email,
    password: payload.password,
    full_name: payload.fullName,
    phone: payload.phone,
    role: 'store_staff',
    store_id: payload.storeId,
  })
  return response.data
}

export async function fetchSupermarketAuditLogs(params = {}) {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/audit-logs', { params })
  return response.data.items || []
}

export async function fetchSupermarketReports(range = '30d') {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/reports', {
    params: { range },
  })
  return response.data
}

export async function fetchExpiringProducts(days = 7, storeId = null) {
  requireSupermarketAdmin()
  const params = { days }
  if (storeId) {
    params.store_id = storeId
  }
  const response = await API.get('/supermarket-admin/expiring-products', { params })
  return response.data
}

export async function fetchDonationMonitoring(statusFilter = 'all') {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/donations', {
    params: { status_filter: statusFilter },
  })
  return response.data.items || []
}

export async function fetchDonationDetail(requestId) {
  requireSupermarketAdmin()
  const response = await API.get(`/supermarket-admin/donations/${requestId}`)
  return response.data
}

export async function fetchSupermarketProducts() {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/products')
  return response.data.items || []
}

export async function fetchSupermarketCategories() {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/categories')
  return response.data.items || []
}

export async function fetchSupermarketDashboardSummary(period = 'daily') {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/dashboard-summary', {
    params: { period },
  })
  return response.data
}

export async function fetchSupermarketProfile() {
  requireSupermarketAdmin()
  const response = await API.get('/supermarket-admin/profile')
  return response.data
}

export async function updateSupermarketProfile(payload) {
  requireSupermarketAdmin()
  const params = new URLSearchParams({
    name: payload.name || '',
    address: payload.address || '',
  })
  const response = await API.put('/supermarket-admin/profile?' + params.toString())
  return response.data
}

export async function updateSupermarketInfo(payload) {
  return updateSupermarketProfile(payload)
}

export async function updateSupermarketAdminUser(userId, payload) {
  requireSupermarketAdmin()
  const response = await API.put(`/supermarket-admin/user/${userId}`, payload)
  return response.data
}

export async function changeSupermarketAdminPassword(payload) {
  requireSupermarketAdmin()
  const response = await API.post('/supermarket-admin/user/change-password', payload)
  return response.data
}
