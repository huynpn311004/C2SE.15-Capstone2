import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_DISPLAY } from '../../services/AuthContext'
import './CharityLayout.css'

const CHARITY_PROFILE_STORAGE_KEY = 'seims_charity_profile'

const DEFAULT_CHARITY_PROFILE = {
  fullName: 'Tổ chức từ thiện ABC',
  email: 'charity@abc.vn',
  phone: '0900000000',
  position: 'Charity Organization',
}

function getStoredCharityProfile() {
  try {
    const raw = localStorage.getItem(CHARITY_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_CHARITY_PROFILE
    return { ...DEFAULT_CHARITY_PROFILE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CHARITY_PROFILE
  }
}

export default function CharityLayout({ children }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [charityProfile, setCharityProfile] = useState(getStoredCharityProfile)
  const navigate = useNavigate()
  const displayName = user?.full_name || charityProfile.fullName || 'Tổ Chức Tờng Thiện'

  useEffect(() => {
    function syncCharityProfile() {
      setCharityProfile(getStoredCharityProfile())
    }
    window.addEventListener('storage', syncCharityProfile)
    window.addEventListener('seims-charity-profile-updated', syncCharityProfile)
    return () => {
      window.removeEventListener('storage', syncCharityProfile)
      window.removeEventListener('seims-charity-profile-updated', syncCharityProfile)
    }
  }, [])

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="charity-layout">
      {/* SIDEBAR */}
      <aside className={`charity-sidebar ${sidebarOpen ? 'open' : 'closed'}`} aria-label="Điều hướng chính">
        <div className="charity-sidebar-header">
          <Link to="/charity/dashboard" className="charity-logo">
            <span className="charity-logo-text">SEIMS</span>
          </Link>
          <button
            className="charity-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Đóng sidebar' : 'Mở sidebar'}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="charity-nav">
          <div className="charity-nav-group">
            <ul>
              <li>
                <NavLink
                  to="/charity/dashboard"
                  className={({ isActive }) => `charity-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="charity-nav-label">Dashboard</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/charity/market"
                  className={({ isActive }) => `charity-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="charity-nav-label">Chợ Donation Offer</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/charity/history"
                  className={({ isActive }) => `charity-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="charity-nav-label">Lịch Sử & Trạng Thái</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/charity/settings"
                  className={({ isActive }) => `charity-nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="charity-nav-label">Cài Đặt</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="charity-sidebar-footer">
          <button className="charity-logout-btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {sidebarOpen && (
        <div
          className="charity-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="charity-main">
        {/* HEADER */}
        <header className="charity-header" aria-label="Thanh công cụ">
          <button
            className="charity-header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="charity-header-title">
            <h1>Xin chào, {displayName}</h1>
          </div>
          <div className="charity-header-actions">
            <div className="charity-user-menu">
              <span className="charity-user-role">
                {ROLE_DISPLAY[user?.role] || 'Tổ Chức Tờng Thiện'}
              </span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="charity-content">{children}</main>
      </div>
    </div>
  )
}
