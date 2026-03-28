import { createContext, useContext, useMemo, useState } from 'react'

import API from './api'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'seims_auth_user'

export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  SUPERMARKET_ADMIN: 'supermarket_admin',
  STORE_STAFF: 'store_staff',
  CUSTOMER: 'customer',
  CHARITY: 'charity',
  DELIVERY: 'delivery',
  DELIVERY_PARTNER: 'delivery_partner',
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)

  async function register(payload) {
    const response = await API.post('/auth/register', payload)
    return response.data
  }

  async function login(payload) {
    const response = await API.post('/auth/login', payload)
    const nextUser = response.data?.user || null
    setUser(nextUser)
    if (nextUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    }
    return response.data
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  function hasRole(...roles) {
    if (!user) return false
    return roles.includes(user.role)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      register,
      login,
      logout,
      hasRole,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
