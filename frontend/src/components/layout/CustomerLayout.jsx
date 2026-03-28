import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext'
import './CustomerLayout.css'

const CUSTOMER_PROFILE_STORAGE_KEY = 'seims_customer_profile'

const DEFAULT_CUSTOMER_PROFILE = {
  fullName: 'Khách hàng',
  email: 'customer@seims.vn',
}

function getStoredCustomerProfile() {
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_CUSTOMER_PROFILE
    return { ...DEFAULT_CUSTOMER_PROFILE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CUSTOMER_PROFILE
  }
}

export default function CustomerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [customerProfile, setCustomerProfile] = useState(getStoredCustomerProfile)
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    customerProfile.fullName ||
    'Khách hàng'

  useEffect(() => {
    function syncProfile() {
      setCustomerProfile(getStoredCustomerProfile())
    }

    window.addEventListener('storage', syncProfile)
    window.addEventListener('seims-customer-profile-updated', syncProfile)

    return () => {
      window.removeEventListener('storage', syncProfile)
      window.removeEventListener('seims-customer-profile-updated', syncProfile)
    }
  }, [])

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="customer-layout">
      {/* SIDEBAR */}
      <aside
        className={`customer-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        aria-label="Điều hướng khách hàng"
      >
        <div className="customer-sidebar-header">
          <Link to="/customer/shop" className="customer-logo">
            <span className="customer-logo-badge">S</span>
            <span className="customer-logo-lines">
              <span className="customer-logo-text">SEIMS</span>
              <span className="customer-logo-subtext">
                Xin chào, {displayName}
              </span>
            </span>
          </Link>
          <button
            className="customer-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="customer-nav">
          <div className="customer-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/customer/home"
                  className={({ isActive }) =>
                    `customer-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="customer-nav-label">Trang chủ</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customer/shop"
                  className={({ isActive }) =>
                    `customer-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="customer-nav-label">Mua sắm</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customer/cart"
                  className={({ isActive }) =>
                    `customer-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="customer-nav-label">Giỏ hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customer/orders"
                  className={({ isActive }) =>
                    `customer-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="customer-nav-label">Đơn hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/customer/profile"
                  className={({ isActive }) =>
                    `customer-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  <span className="customer-nav-label">Cài đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="customer-sidebar-footer">
          <button className="customer-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="customer-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="customer-main">
        {/* HEADER */}
        <header className="customer-header" aria-label="Thanh công cụ">
          <button
            className="customer-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="customer-header-title">
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="customer-header-actions">
            <button className="customer-header-btn" aria-label="Thông báo" title="Thông báo">
              Thông báo
            </button>
            <div className="customer-user-menu">
              <button className="customer-user-btn" aria-label="Menu người dùng">
                {displayName}
              </button>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="customer-content">{children}</main>
      </div>
    </div>
  )
}
