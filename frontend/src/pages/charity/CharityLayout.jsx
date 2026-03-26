import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './CharityLayout.css';

const CharityLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <div className="admin-logo-badge">S</div>
            <div className="admin-logo-lines">
              <span className="admin-logo-text">SEIMS</span>
              <span className="admin-logo-subtext">Charity Portal</span>
            </div>
          </div>
        </div>

        <nav className="admin-nav mt-4">
          <div className="admin-nav-group">
            <span className="admin-nav-group-title px-6">QUYÊN GÓP</span>
            <ul className="mt-2">
              <li>
                <NavLink to="/charity/market" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                  <span>🛒</span>
                  <span className="admin-nav-label">Chợ Donation Offer</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/charity/history" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
                  <span>📜</span>
                  <span className="admin-nav-label">Trạng thái & Lịch sử</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        <div className="admin-sidebar-footer p-4 mt-auto">
          <button className="admin-logout-btn w-full" onClick={() => navigate('/login')}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN SECTION */}
      <div className="admin-main flex flex-col">
        <header className="admin-header">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-2xl" onClick={() => setIsMobileOpen(true)}>☰</button>
            <h1 className="text-lg font-bold text-[#134e4a]">Hệ thống Tổ chức Từ thiện</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-800">Quỹ Bầu Ơi</p>
              <p className="text-[10px] text-teal-600 font-medium">Verified Charity</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-teal-700">
              B
            </div>
          </div>
        </header>

        <main className="admin-content flex-1 p-6 overflow-y-auto">
          {/* Outlet bọc trong div có animation để chuyển trang mượt */}
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)}></div>
      )}
    </div>
  );
};

export default CharityLayout;