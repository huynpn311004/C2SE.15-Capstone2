import API from './api'
import {
  fetchAdminAuditLogs,
  fetchAdminDashboardSummary,
  fetchAdminReports,
  fetchAdminSupermarkets,
  fetchAdminUsers,
  toggleAdminUserLock,
  updateAdminUser,
  deleteAdminUser,
} from './adminApi'

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return 0
  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchSupermarketDashboardData() {
  const [summary, reports, users, logs] = await Promise.all([
    fetchAdminDashboardSummary(),
    fetchAdminReports('30d'),
    fetchAdminUsers(),
    fetchAdminAuditLogs({ limit: 30 }),
  ])

  const staff = users.filter((item) => (item.role || '').toLowerCase() === 'store staff')
  const donationLogs = logs.filter((log) => /donat|quyen|charity/i.test(log.action || ''))

  return {
    stats: {
      stores: Number(summary.supermarkets || 0),
      staff: staff.length,
      pending: Number(summary.pendingRequests || 0),
      nearExpiry: Math.max(0, toNumber(reports?.metrics?.orders) - Number(summary.pendingRequests || 0)),
    },
    storePerformance: (reports?.supermarketTop || []).map((item) => ({
      name: item.name || '-',
      orders: Number(item.orders || 0),
      revenue: item.growth || 'N/A',
      status: Number(item.orders || 0) > 0 ? 'active' : 'warning',
    })),
    recentDonations: donationLogs.slice(0, 5).map((log) => ({
      id: log.id,
      store: log.entityType || '-',
      items: log.action || '-',
      recipient: log.actor || '-',
      date: log.time || '-',
      status: 'completed',
    })),
  }
}

export async function fetchSupermarketStores(userId) {
  const response = await API.get('/supermarket-admin/stores', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function saveSupermarketStore(storeId, payload, userId) {
  await API.put(`/supermarket-admin/stores/${storeId}`, payload, {
    params: { user_id: userId },
  })
}

export async function createSupermarketStore(payload, userId) {
  await API.post('/supermarket-admin/stores', payload, {
    params: { user_id: userId },
  })
}

export async function removeSupermarketStore(storeId, userId) {
  await API.delete(`/supermarket-admin/stores/${storeId}`, {
    params: { user_id: userId },
  })
}

export async function fetchSupermarketStaff() {
  const users = await fetchAdminUsers()
  return users.filter((item) => (item.role || '').toLowerCase() === 'store staff')
}

export async function saveSupermarketStaff(userId, payload) {
  await updateAdminUser(userId, payload)
}

export async function toggleSupermarketStaffLock(userId) {
  await toggleAdminUserLock(userId)
}

export async function removeSupermarketStaff(userId) {
  await deleteAdminUser(userId)
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

export async function fetchSupermarketAuditLogs(limit = 200) {
  return fetchAdminAuditLogs({ limit })
}

export async function fetchSupermarketReports(range = '30d') {
  const [reports, supermarkets] = await Promise.all([
    fetchAdminReports(range),
    fetchAdminSupermarkets(),
  ])

  const reportTop = Array.isArray(reports?.supermarketTop) ? reports.supermarketTop : []

  if (reportTop.length > 0) {
    return reports
  }

  return {
    ...reports,
    supermarketTop: supermarkets.map((item) => ({
      name: item.name || '-',
      orders: 0,
      growth: '0',
    })),
  }
}
