import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './SystemAdminLayout.css'

/**
 * Layout chính cho System Admin
 * Cấu trúc: Sidebar (trái) + Header (trên) + Main Content (phải)
 */
export default function SystemAdminLayout({ children }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const displayName = user?.full_name || 'Admin'
  const navigate = useNavigate()

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
            <span className="admin-logo-text">SEIMS</span>
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
                  <span className="admin-nav-label">Trang chủ</span>
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
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="admin-header-actions">
            <div className="admin-user-menu">
              <span className="admin-user-role">
                {ROLE_DISPLAY[user?.role] || 'Quản Trị Hệ Thống'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
