import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './CustomerLayout.css'

const CUSTOMER_SETTING_STORAGE_KEY = 'seims_customer_setting'

const DEFAULT_CUSTOMER_SETTING = {
  fullName: 'Khách hàng',
  email: 'customer@seims.vn',
}

function getStoredCustomerSetting() {
  try {
    const raw = localStorage.getItem(CUSTOMER_SETTING_STORAGE_KEY)
    if (!raw) return DEFAULT_CUSTOMER_SETTING
    return { ...DEFAULT_CUSTOMER_SETTING, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CUSTOMER_SETTING
  }
}

export default function CustomerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [customerSetting, setCustomerSetting] = useState(getStoredCustomerSetting)
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    customerSetting.fullName ||
    'Khách hàng'

  useEffect(() => {
    function syncSetting() {
      setCustomerSetting(getStoredCustomerSetting())
    }

    window.addEventListener('storage', syncSetting)
    window.addEventListener('seims-customer-setting-updated', syncSetting)

    return () => {
      window.removeEventListener('storage', syncSetting)
      window.removeEventListener('seims-customer-setting-updated', syncSetting)
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
            <span className="customer-logo-text">SEIMS</span>
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
            <div className="customer-user-menu">
              <span className="customer-user-role">
                {ROLE_DISPLAY[user?.role] || 'Khách Hàng'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="customer-content">{children}</main>
      </div>
    </div>
  )
}
