import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './DeliveryLayout.css'

const DELIVERY_PROFILE_STORAGE_KEY = 'seims_delivery_profile'

const DEFAULT_DELIVERY_PROFILE = {
  fullName: 'Đối Tác Giao Hàng',
  email: 'delivery@seims.vn',
  phone: '0900000000',
  position: 'Delivery Partner',
}

function getStoredDeliveryProfile() {
  try {
    const raw = localStorage.getItem(DELIVERY_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_DELIVERY_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_DELIVERY_PROFILE,
      ...parsed,
    }
  } catch {
    return DEFAULT_DELIVERY_PROFILE
  }
}

/**
 * Layout chính cho Delivery Partner
 * Cấu trúc: Sidebar (trái) + Header (trên) + Main Content (phải)
 */
export default function DeliveryLayout({ children }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deliveryProfile, setDeliveryProfile] = useState(getStoredDeliveryProfile)
  const navigate = useNavigate()
  const displayName = user?.full_name || deliveryProfile.fullName || 'Đối Tác Giao Hàng'

  useEffect(() => {
    function syncDeliveryProfile() {
      setDeliveryProfile(getStoredDeliveryProfile())
    }

    window.addEventListener('storage', syncDeliveryProfile)
    window.addEventListener('seims-delivery-profile-updated', syncDeliveryProfile)

    return () => {
      window.removeEventListener('storage', syncDeliveryProfile)
      window.removeEventListener('seims-delivery-profile-updated', syncDeliveryProfile)
    }
  }, [])

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="delivery-layout">
      {/* SIDEBAR */}
      <aside className={`delivery-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Điều hướng chính">
        <div className="delivery-sidebar-header">
          <Link to="/" className="delivery-logo">
            <span className="delivery-logo-text">SEIMS</span>
          </Link>
          <button
            className="delivery-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="delivery-nav">
          <div className="delivery-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/delivery/dashboard"
                  className={({ isActive }) => `delivery-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="delivery-nav-label">Trang Chủ</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/delivery/orders"
                  className={({ isActive }) => `delivery-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="delivery-nav-label">Đơn Hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/delivery/history"
                  className={({ isActive }) => `delivery-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="delivery-nav-label">Lịch Sử Giao Hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/delivery/settings"
                  className={({ isActive }) => `delivery-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="delivery-nav-label">Cài Đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="delivery-sidebar-footer">
          <button className="delivery-logout-btn" onClick={handleLogout}>
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="delivery-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="delivery-main">
        {/* HEADER */}
        <header className="delivery-header" aria-label="Thanh công cụ">
          <button
            className="delivery-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="delivery-header-title">
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="delivery-header-actions">
            <div className="delivery-user-menu">
              <span className="delivery-user-role">
                {ROLE_DISPLAY[user?.role] || 'Đối Tác Giao Hàng'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="delivery-content">{children}</main>
      </div>
    </div>
  )
}
