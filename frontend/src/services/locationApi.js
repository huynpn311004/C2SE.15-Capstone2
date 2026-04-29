/**
 * Location API Service
 * API calls cho geocoding và store locations
 */
import API from './api';

// ============ Geocoding ============

/**
 * Chuyển địa chỉ thành tọa độ
 */
export const geocodeAddress = async (address) => {
  const response = await API.post('/location/geocode', { address });
  return response.data;
};

/**
 * Chuyển tọa độ thành địa chỉ
 */
export const reverseGeocode = async (lat, lng) => {
  const response = await API.post('/location/reverse-geocode', {
    latitude: lat,
    longitude: lng,
  });
  return response.data;
};

/**
 * Tính khoảng cách giữa 2 điểm
 */
export const calculateDistance = async (lat1, lng1, lat2, lng2) => {
  const response = await API.post('/location/distance', {
    lat1, lng1, lat2, lng2,
  });
  return response.data;
};

// ============ Store Locations ============

/**
 * Lấy danh sách cửa hàng có tọa độ
 * @param {Object} params - { lat, lng, radius_km }
 */
export const getStoresWithLocation = async (params = {}) => {
  const response = await API.get('/location/stores', { params });
  return response.data;
};

/**
 * Lấy thông tin vị trí một cửa hàng
 */
export const getStoreLocation = async (storeId, lat, lng) => {
  const response = await API.get(`/location/stores/${storeId}`, {
    params: { lat, lng },
  });
  return response.data;
};

/**
 * Cập nhật tọa độ cửa hàng (store owner)
 */
export const updateStoreLocation = async (storeId, latitude, longitude) => {
  const response = await API.put(`/location/stores/${storeId}/location`, {
    latitude,
    longitude,
  });
  return response.data;
};

// ============ User Location ============

/**
 * Cập nhật tọa độ user (customer)
 */
export const updateUserLocation = async (latitude, longitude, address = null) => {
  const payload = {
    latitude,
    longitude,
  }
  if (address) {
    payload.address = address
  }
  const response = await API.put('/location/users/me/location', payload);
  return response.data;
};
