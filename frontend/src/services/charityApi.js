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

// --- Profile ---

export async function fetchCharityProfile() {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.get('/charity/profile', {
    params: { user_id: userId },
  })
  return response.data
}

export async function updateCharityProfile(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.put('/charity/profile', payload, {
    params: { user_id: userId },
  })
  return response.data
}

export async function changeCharityPassword(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.post('/charity/change-password', payload, {
    params: { user_id: userId },
  })
  return response.data
}

// --- Dashboard ---

export async function fetchCharityDashboardSummary() {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.get('/charity/dashboard-summary', {
    params: { user_id: userId },
  })
  return response.data
}

// --- Donation Offers (Market) ---

export async function fetchCharityDonationOffers() {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.get('/charity/donation-offers', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function createDonationRequest(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.post('/charity/donation-requests', payload, {
    params: { user_id: userId },
  })
  return response.data
}

// --- Donation Requests (History) ---

export async function fetchCharityDonationRequests() {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.get('/charity/donation-requests', {
    params: { user_id: userId },
  })
  return response.data.items || []
}

export async function confirmDonationReceived(requestId, payload = {}) {
  const userId = getUserId()
  if (!userId) throw new Error('Khong tim thay thong tin nguoi dung')

  const response = await API.put(`/charity/donation-requests/${requestId}/confirm-received`, payload, {
    params: { user_id: userId },
  })
  return response.data
}
