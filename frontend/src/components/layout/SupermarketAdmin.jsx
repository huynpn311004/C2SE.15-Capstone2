import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './SupermarketAdmin.css'

const ADMIN_PROFILE_KEY = 'supermarket_admin_profile'

const DEFAULT_PROFILE = {
  fullName: 'Quản Lý SM',
  email: 'manager@supermarket.vn',
  phone: '0900000000',
  supermarket: 'BigMart Trung Tâm',
}

function getStoredProfile() {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROFILE
  }
}

export default function SupermarketAdminLayout({ children }) {
  const displayName = user?.full_name || profile.fullName || 'Quản Lý SM'

  useEffect(() => {
    function sync() { setProfile(getStoredProfile()) }
    window.addEventListener('storage', sync)
    window.addEventListener('supermarket-admin-profile-updated', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('supermarket-admin-profile-updated', sync)
    }
  }, [])

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="supermarketadmin-layout">
      {/* SIDEBAR */}
      <aside className={`supermarketadmin-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Điều hướng chính">
        <div className="supermarketadmin-sidebar-header">
          <Link to="/supermarketadmin/dashboard" className="supermarketadmin-logo">
            <span className="supermarketadmin-logo-text">SEIMS</span>
          </Link>
          <button
            className="supermarketadmin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="supermarketadmin-nav">
          <div className="supermarketadmin-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/supermarketadmin/dashboard"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Trang Chủ</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/stores"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Quản Lý Store</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/staff"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Quản Lý Store Staff</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/policies"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Cấu Hình Chính Sách</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/reports"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Báo Cáo & Phân Tích</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/donations"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Giám Sát Quyên Góp</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/audit-logs"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Nhật Ký Kiểm Toán</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/supermarketadmin/settings"
                  className={({ isActive }) => `supermarketadmin-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="supermarketadmin-nav-label">Cài Đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="supermarketadmin-sidebar-footer">
          <button className="supermarketadmin-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="supermarketadmin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="supermarketadmin-main">
        {/* HEADER */}
        <header className="supermarketadmin-header" aria-label="Thanh công cụ">
          <button
            className="supermarketadmin-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="supermarketadmin-header-title">
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="supermarketadmin-header-actions">
            <div className="supermarketadmin-user-menu">
              <span className="supermarketadmin-user-role">
                {ROLE_DISPLAY[user?.role] || 'Người dùng'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="supermarketadmin-content">{children}</main>
      </div>
    </div>
  )
}
