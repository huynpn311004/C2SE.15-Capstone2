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

// Lấy danh sách đơn giao hàng đang hoạt động của delivery partner
export async function fetchDeliveryOrders() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/delivery/orders', {
    params: { user_id: userId },
  })
  return response.data
}

// Lấy đơn hàng đang giao (assigned, picking_up, delivering)
export async function fetchActiveDeliveries() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/delivery/orders/active', {
    params: { user_id: userId },
  })
  return response.data
}

// Lấy lịch sử giao hàng đã hoàn thành
export async function fetchDeliveryHistory(filter = 'all') {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/delivery/history', {
    params: { user_id: userId, filter },
  })
  return response.data
}

// Cập nhật trạng thái giao hàng
export async function updateDeliveryStatus(deliveryId, newStatus) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put(
    `/delivery/orders/${deliveryId}/status`,
    { status: newStatus },
    { params: { user_id: userId } }
  )
  return response.data
}

// Lấy chi tiết một đơn giao hàng
export async function fetchDeliveryDetail(deliveryId) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get(`/delivery/orders/${deliveryId}`, {
    params: { user_id: userId },
  })
  return response.data
}

// Lấy thông tin profile delivery partner
export async function fetchDeliveryProfile() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/delivery/profile', {
    params: { user_id: userId },
  })
  return response.data
}

// Cập nhật profile delivery partner
export async function updateDeliveryProfile(payload) {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.put('/delivery/profile', payload, {
    params: { user_id: userId },
  })
  return response.data
}

// Lấy thống kê delivery partner
export async function fetchDeliveryStats() {
  const userId = getUserId()
  if (!userId) throw new Error('Không tìm thấy thông tin người dùng')

  const response = await API.get('/delivery/stats', {
    params: { user_id: userId },
  })
  return response.data
}
