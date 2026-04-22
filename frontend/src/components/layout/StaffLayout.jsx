import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './StaffLayout.css'

const STAFF_PROFILE_STORAGE_KEY = 'seims_staff_profile'

const DEFAULT_STAFF_PROFILE = {
  fullName: 'Nhân Viên',
  email: 'staff@seims.vn',
  phone: '0900000000',
  position: 'Nhân Viên Cửa Hàng',
}

function getStoredStaffProfile() {
  try {
    const raw = localStorage.getItem(STAFF_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_STAFF_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_STAFF_PROFILE,
      ...parsed,
    }
  } catch {
    return DEFAULT_STAFF_PROFILE
  }
}

/**
 * Layout chính cho Staff
 * Cấu trúc: Sidebar (trái) + Header (trên) + Main Content (phải)
 */
export default function StaffLayout({ children }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [staffProfile, setStaffProfile] = useState(getStoredStaffProfile)
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = user?.full_name || staffProfile.fullName || 'Nhân Viên'

  useEffect(() => {
    function syncStaffProfile() {
      setStaffProfile(getStoredStaffProfile())
    }

    window.addEventListener('storage', syncStaffProfile)
    window.addEventListener('seims-staff-profile-updated', syncStaffProfile)

    return () => {
      window.removeEventListener('storage', syncStaffProfile)
      window.removeEventListener('seims-staff-profile-updated', syncStaffProfile)
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/staff') {
      navigate('/staff/dashboard', { replace: true })
    }
  }, [location.pathname, navigate])

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="staff-layout">
      {/* SIDEBAR */}
      <aside className={`staff-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Điều hướng chính">
        <div className="staff-sidebar-header">
          <Link to="/staff/dashboard" className="staff-logo">
            <span className="staff-logo-text">SEIMS</span>
          </Link>
          <button
            className="staff-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="staff-nav">
          <div className="staff-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/staff/dashboard"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Bảng Điều Khiển</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/categories"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Quản Lý Danh Mục</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/products"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Quản Lý Sản Phẩm</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/inventory-lots"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Lô Hàng Tồn Kho</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/expiry-tracking"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Theo Dõi Hạn Sử Dụng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/orders"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Quản Lý Đơn Hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/donations"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Quản Lý Quyên Góp</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/notifications"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Thông Báo</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/staff/settings"
                  className={({ isActive }) => `staff-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="staff-nav-label">Cài Đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="staff-sidebar-footer">
          <button className="staff-logout-btn" onClick={handleLogout}>
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="staff-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="staff-main">
        {/* HEADER */}
        <header className="staff-header" aria-label="Thanh công cụ">
          <button
            className="staff-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="staff-header-title">
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="staff-header-actions">
            <div className="staff-user-menu">
              <span className="staff-user-role">
                {ROLE_DISPLAY[user?.role] || 'Nhân Viên'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="staff-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
