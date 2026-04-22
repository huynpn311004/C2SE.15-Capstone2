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

function requireCharity() {
  const role = getUserRole()
  if (role !== 'charity') {
    throw new Error('Tai khoan khong phai la to chuc tu thien')
  }
  const userId = getUserId()
  if (!userId) {
    throw new Error('Chua dang nhap')
  }
  return userId
}

// --- Profile ---

export async function fetchCharityProfile() {
  requireCharity()
  const response = await API.get('/charity/profile')
  return response.data
}

export async function updateCharityProfile(payload) {
  requireCharity()
  const params = new URLSearchParams({
    full_name: payload.fullName || '',
    email: payload.email || '',
    phone: payload.phone || '',
    org_name: payload.orgName || '',
    address: payload.address || '',
  })
  const response = await API.put('/charity/profile?' + params.toString())
  return response.data
}

export async function changeCharityPassword(payload) {
  requireCharity()
  const response = await API.post('/charity/change-password', payload)
  return response.data
}

// --- Dashboard ---

export async function fetchCharityDashboardSummary() {
  requireCharity()
  const response = await API.get('/charity/dashboard-summary')
  return response.data
}

// --- Donation Offers (Market) ---

export async function fetchCharityDonationOffers() {
  requireCharity()
  const response = await API.get('/charity/donation-offers')
  return response.data.items || []
}

export async function createDonationRequest(payload) {
  requireCharity()
  const response = await API.post('/charity/donation-requests', payload)
  return response.data
}

// --- Donation Requests (History) ---

export async function fetchCharityDonationRequests() {
  requireCharity()
  const response = await API.get('/charity/donation-requests')
  return response.data.items || []
}

export async function confirmDonationReceived(requestId, payload = {}) {
  requireCharity()
  const response = await API.put(`/charity/donation-requests/${requestId}/confirm-received`, payload)
  return response.data
}
