import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
})

// Attach JWT token to requests
API.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem('seims_auth_user')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`
        }
      } catch (e) {
        console.warn('Failed to parse auth user:', e)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default API