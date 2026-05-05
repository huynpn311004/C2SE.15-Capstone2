/**
 * Coupon API wrapper for supermarket admin coupon management
 */

import API from './api'

/**
 * List all coupons for the supermarket
 */
export async function fetchCoupons() {
  const response = await API.get('/coupon/')
  return response.data.items || []
}

/**
 * Create a new coupon
 */
export async function createCoupon(payload) {
  const params = {
    code: payload.code,
    description: payload.description || null,
    discount: payload.discountPercent,
    min_amount: payload.minAmount || null,
    max_uses: payload.maxUses || null,
    valid_from: payload.validFrom,
    valid_to: payload.validTo,
  }

  const response = await API.post('/coupon/', null, { params })
  return response.data
}

/**
 * Update a coupon
 */
export async function updateCoupon(couponId, payload) {
  const params = {}

  if (payload.code !== undefined) params.code = payload.code
  if (payload.description !== undefined) params.description = payload.description
  if (payload.discountPercent !== undefined) params.discount = payload.discountPercent
  if (payload.minAmount !== undefined) params.min_amount = payload.minAmount
  if (payload.maxUses !== undefined) params.max_uses = payload.maxUses
  if (payload.validFrom !== undefined) params.valid_from = payload.validFrom
  if (payload.validTo !== undefined) params.valid_to = payload.validTo
  if (payload.isActive !== undefined) params.is_active = payload.isActive

  const response = await API.put(`/coupon/${couponId}`, null, { params })
  return response.data
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(couponId) {
  const response = await API.delete(`/coupon/${couponId}`)
  return response.data
}

/**
 * Toggle coupon active/inactive
 */
export async function toggleCoupon(couponId) {
  const response = await API.patch(`/coupon/${couponId}/toggle`)
  return response.data
}
