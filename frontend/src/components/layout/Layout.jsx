import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import './Layout.css'

const ADMIN_PROFILE_STORAGE_KEY = 'seims_admin_profile'

const DEFAULT_ADMIN_PROFILE = {
  fullName: 'Admin',
  email: 'admin@seims.vn',
  phone: '0900000000',
  position: 'System Admin',
}

function getStoredAdminProfile() {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_ADMIN_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_ADMIN_PROFILE,
      ...parsed,
    }
  } catch {
    return DEFAULT_ADMIN_PROFILE
  }
}

/**
 * Layout chính cho System Admin
 * Cấu trúc: Sidebar (trái) + Header (trên) + Main Content (phải)
 */
export default function SystemAdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminProfile, setAdminProfile] = useState(getStoredAdminProfile)
  const navigate = useNavigate()

  useEffect(() => {
    function syncAdminProfile() {
      setAdminProfile(getStoredAdminProfile())
    }

    window.addEventListener('storage', syncAdminProfile)
    window.addEventListener('seims-admin-profile-updated', syncAdminProfile)

    return () => {
      window.removeEventListener('storage', syncAdminProfile)
      window.removeEventListener('seims-admin-profile-updated', syncAdminProfile)
    }
  }, [])

  function handleLogout() {
    // TODO: gọi API logout, xóa token
    navigate('/login')
  }

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Điều hướng chính">
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-logo">
            <span className="admin-logo-badge">S</span>
            <span className="admin-logo-lines">
              <span className="admin-logo-text">SEIMS</span>
              <span className="admin-logo-subtext">Xin chào, {adminProfile.fullName}</span>
            </span>
          </Link>
          <button
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/supermarkets"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Quản Lý Siêu Thị</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/charities"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Quản Lý Tổ Chức Từ Thiện</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/delivery"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Quản lý Giao Hàng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Quản Lý Người Dùng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Báo Cáo & Phân Tích</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/audit-logs"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Audit Log</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/settings"
                  className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="admin-nav-label">Cài Đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="admin-main">
        {/* HEADER */}
        <header className="admin-header" aria-label="Thanh công cụ">
          <button
            className="admin-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="admin-header-title">
            <h1>Hệ thống quản trị SEIMS</h1>
          </div>
          <div className="admin-header-actions">
            <button className="admin-header-btn" aria-label="Thông báo" title="Thông báo">
              Thông báo
            </button>
            <div className="admin-user-menu">
              <button className="admin-user-btn" aria-label="Menu người dùng">
                {adminProfile.fullName}
              </button>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
