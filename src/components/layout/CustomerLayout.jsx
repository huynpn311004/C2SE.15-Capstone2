import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Package, ShoppingCart, Clock, User, LogOut, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './CustomerLayout.css';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { name: 'Trang chủ', path: '/customer/home', icon: <Package size={20} /> },
    { name: 'Giỏ hàng', path: '/customer/cart', icon: <ShoppingCart size={20} /> },
    { name: 'Đơn hàng', path: '/customer/orders', icon: <Clock size={20} /> },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="customer-layout-wrapper">
      {/* SIDEBAR */}
      <aside className={`seims-sidebar ${sidebarOpen ? '' : 'w-24'}`}>
        {/* Logo */}
        <div className="sidebar-header">
          {sidebarOpen ? (
            <div className="logo-container">
              <div className="logo-box">S</div>
              <div className="logo-text">
                <span className="brand">SEIMS</span>
                <span className="sub">Customer</span>
              </div>
            </div>
          ) : (
            <div className="logo-box" style={{ margin: '0 auto' }}>S</div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <button onClick={() => navigate('/customer/profile')} className="footer-link">
            <User size={20} />
            {sidebarOpen && <span>Tài khoản</span>}
          </button>
          
          <button onClick={handleLogout} className="footer-link logout">
            <LogOut size={20} />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* TOP BAR */}
        <header className="main-header">
          <div className="header-left">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="toggle-btn">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          <div className="header-right">
            {/* Notifications */}
            <button className="notification-btn">
              <Bell size={20} />
              <span className="notification-badge"></span>
            </button>

            {/* User Profile */}
            <div className="user-pill">
              <div className="user-meta">
                <p className="name">Khách hàng</p>
                <p className="status">customer@seims.vn</p>
              </div>
              <div className="user-avatar">K</div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="page-container">
          <div className="page-inner-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;