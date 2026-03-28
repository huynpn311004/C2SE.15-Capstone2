import { useState, useEffect } from 'react';
import './CustomerDashboard.css';

const CUSTOMER_PROFILE_KEY = 'seims_customer_profile';

const defaultProfile = {
  fullName: 'Khách hàng',
  email: 'customer@seims.vn',
  phone: '0901 234 567',
  address: '123 Đường ABC, Quận 1, TP.HCM',
};

export default function CustomerProfile() {
  const [profile, setProfile] = useState(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOMER_PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile({ ...defaultProfile, ...parsed });
        setFormData({ ...defaultProfile, ...parsed });
      }
    } catch {
      setProfile(defaultProfile);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(formData));
    setProfile(formData);
    window.dispatchEvent(new Event('seims-customer-profile-updated'));
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  return (
    <div className="customer-page">
      {/* Welcome Header */}
      <div className="customer-welcome">
        <div>
          <h2>Tài khoản của bạn</h2>
          <p>Quản lý thông tin cá nhân</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="customer-products-section">
        <div className="customer-section-header">
          <div>
            <h3 className="customer-section-title">Thông tin cá nhân</h3>
            <p className="customer-section-subtitle">
              {isEditing ? 'Chỉnh sửa thông tin của bạn' : 'Xem và cập nhật thông tin'}
            </p>
          </div>
          {!isEditing && (
            <button
              className="customer-filter-btn"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Chỉnh sửa
            </button>
          )}
        </div>

        {saved && (
          <div style={{
            margin: '0 1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--seims-success)',
            borderRadius: '8px',
            color: 'var(--seims-success)',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            ✅ Thông tin đã được lưu thành công!
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                👤 Họ và tên *
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="customer-search-input"
                placeholder="Nhập họ và tên của bạn"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📧 Email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="customer-search-input"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📞 Số điện thoại *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="customer-search-input"
                placeholder="0901 234 567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--seims-ink)', marginBottom: '0.5rem' }}>
                📍 Địa chỉ mặc định
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="customer-search-input"
                rows="3"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="submit" className="customer-add-to-cart-btn" style={{ flex: 1 }}>
                💾 Lưu thông tin
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'white',
                  border: '1px solid var(--seims-border)',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: 'var(--seims-ink)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--seims-teal)'; e.currentTarget.style.color = 'var(--seims-teal)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--seims-border)'; e.currentTarget.style.color = 'var(--seims-ink)'; }}
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--seims-teal), var(--seims-teal-light))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                color: 'white',
                fontWeight: '700',
                flexShrink: 0,
              }}>
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem', color: 'var(--seims-ink)' }}>
                  {profile.fullName}
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--seims-muted)' }}>
                  Khách hàng SEIMS
                </p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--seims-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem' }}>👤</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Họ và tên</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '600', color: 'var(--seims-ink)', fontSize: '0.9rem' }}>{profile.fullName}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem' }}>📧</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '600', color: 'var(--seims-ink)', fontSize: '0.9rem' }}>{profile.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem' }}>📞</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Số điện thoại</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '600', color: 'var(--seims-ink)', fontSize: '0.9rem' }}>{profile.phone}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem' }}>📍</span>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--seims-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Địa chỉ mặc định</p>
                  <p style={{ margin: '0.2rem 0 0 0', fontWeight: '600', color: 'var(--seims-ink)', fontSize: '0.9rem' }}>{profile.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">📦</span>
          </div>
          <div className="customer-stat-value">0</div>
          <div className="customer-stat-label">Đơn hàng đang xử lý</div>
        </div>
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">✅</span>
          </div>
          <div className="customer-stat-value">0</div>
          <div className="customer-stat-label">Đơn hàng đã hoàn thành</div>
        </div>
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">💰</span>
          </div>
          <div className="customer-stat-value">0đ</div>
          <div className="customer-stat-label">Tổng chi tiêu</div>
        </div>
        <div className="customer-stat-card">
          <div className="customer-stat-header">
            <span className="customer-stat-icon">🏷</span>
          </div>
          <div className="customer-stat-value">0%</div>
          <div className="customer-stat-label">Tiết kiệm từ sản phẩm cận hạn</div>
        </div>
      </div>
    </div>
  );
}
