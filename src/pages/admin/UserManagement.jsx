import { useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import './UserManagement.css'

/**
 * Trang Quản lý Người dùng
 * System Admin quản lý toàn bộ người dùng: lock/unlock account
 */
export default function UserManagement() {
  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'admin_sm_01',
      fullName: 'Nguyen Van A',
      email: 'admin@bigmart.com',
      phone: '0901 234 567',
      role: 'Supermarket Admin',
      supermarket: 'BigMart Central',
      joinDate: '2024-01-15',
      status: 'active',
      lastLogin: '2024-03-22 14:30',
    },
    {
      id: 2,
      username: 'nv_store_001',
      fullName: 'Tran Thi B',
      email: 'staff@freshmart.com',
      phone: '0912 345 678',
      role: 'Store Staff',
      supermarket: 'FreshMart Downtown',
      joinDate: '2024-02-01',
      status: 'active',
      lastLogin: '2024-03-22 09:15',
    },
    {
      id: 3,
      username: 'customer_123',
      fullName: 'Le Van C',
      email: 'customer@email.com',
      phone: '0923 456 789',
      role: 'Customer',
      supermarket: 'N/A',
      joinDate: '2024-02-10',
      status: 'active',
      lastLogin: '2024-03-21 18:45',
    },
    {
      id: 4,
      username: 'charity_hope',
      fullName: 'Dang Thi E',
      email: 'director@hopefoundation.org',
      phone: '0934 567 890',
      role: 'Charity Organization',
      supermarket: 'N/A',
      joinDate: '2024-03-01',
      status: 'inactive',
      lastLogin: '2024-03-15 10:20',
    },
    {
      id: 5,
      username: 'delivery_partner_01',
      fullName: 'Hoang Van F',
      email: 'delivery@express.com',
      phone: '0945 678 901',
      role: 'Delivery Partner',
      supermarket: 'N/A',
      joinDate: '2024-02-20',
      status: 'active',
      lastLogin: '2024-03-22 11:05',
    },
  ])

  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const filteredUsers = users.filter(user => {
    const roleMatch = filterRole === 'all' || user.role === filterRole
    const statusMatch = filterStatus === 'all' || user.status === filterStatus
    return roleMatch && statusMatch
  })

  function handleToggleLock(id) {
    setUsers(users.map(u =>
      u.id === id
        ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
        : u
    ))
  }

  function handleDeleteUser(id) {
    if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
      setUsers(users.filter((u) => u.id !== id))
      if (selectedUser?.id === id) {
        closeDetail()
      }
    }
  }

  function openDetail(user) {
    setSelectedUser(user)
    setShowDetailModal(true)
  }

  function closeDetail() {
    setShowDetailModal(false)
    setSelectedUser(null)
  }

  const getRoleIcon = (role) => {
    const icons = {
      'System Admin': '👑',
      'Supermarket Admin': '🏪',
      'Store Staff': '👔',
      'Customer': '👨',
      'Charity Organization': '❤️',
      'Delivery Partner': '🚗',
    }
    return icons[role] || '👤'
  }

  const getStatusText = (status) => {
    return status === 'active' ? '✓ Hoạt động' : '🔒 Bị khóa'
  }

  const roleOptions = [
    'all',
    'Supermarket Admin',
    'Store Staff',
    'Customer',
    'Charity Organization',
    'Delivery Partner',
  ]

  return (
    <SystemAdminLayout>
      <div className="users-page">
        {/* FILTERS */}
        <div className="users-filters">
          <div className="filter-group">
            <label>Vai Trò:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              {roleOptions.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'Tất cả vai trò' : role}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Trạng Thái:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Bị khóa</option>
            </select>
          </div>
          <div className="filter-info">
            Hiển thị {filteredUsers.length} / {users.length} người dùng
          </div>
        </div>

        {/* TABLE */}
        <div className="users-card">
          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Tên Người Dùng</th>
                  <th>Email</th>
                  <th>Vai Trò</th>
                  <th>Ngày Tham Gia</th>
                  <th>Lần Đăng Nhập Cuối</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-name">
                          {user.fullName}
                        </div>
                        <div className="users-username">@{user.username}</div>
                      </td>
                      <td>
                        <a href={`mailto:${user.email}`}>{user.email}</a>
                      </td>
                      <td>
                        <span className="role-badge">
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.joinDate).toLocaleDateString('vi-VN')}</td>
                      <td>{user.lastLogin}</td>
                      <td>
                        <div className="action-group">
                          <button
                            className="action-btn icon-action-btn btn-view"
                            onClick={() => openDetail(user)}
                            title="Xem chi tiết"
                            aria-label="Xem chi tiết"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M12 5c5.5 0 9.5 4.6 10.8 6.3a1 1 0 0 1 0 1.4C21.5 14.4 17.5 19 12 19s-9.5-4.6-10.8-6.3a1 1 0 0 1 0-1.4C2.5 9.6 6.5 5 12 5Zm0 2C7.8 7 4.5 10.5 3.2 12 4.5 13.5 7.8 17 12 17s7.5-3.5 8.8-5C19.5 10.5 16.2 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
                            </svg>
                          </button>
                          <button
                            className={`action-btn icon-action-btn ${user.status === 'active' ? 'btn-lock-small' : 'btn-unlock-small'}`}
                            onClick={() => handleToggleLock(user.id)}
                            title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            aria-label={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {user.status === 'active' ? (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M17 9h-7V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z" />
                              </svg>
                            )}
                          </button>
                          <button
                            className="action-btn icon-action-btn btn-delete-small"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Xóa người dùng"
                            aria-label="Xóa người dùng"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL MODAL */}
        {showDetailModal && selectedUser && (
          <div className="modal-overlay" onClick={closeDetail}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chi tiết Người dùng</h3>
                <button className="modal-close" onClick={closeDetail}>✕</button>
              </div>
              <div className="modal-body">
                <div className="users-avatar">
                  <div className="user-avatar-icon">{getRoleIcon(selectedUser.role)}</div>
                  <div className="users-header-info">
                    <div className="users-header-name">{selectedUser.fullName}</div>
                    <div className="users-header-username">@{selectedUser.username}</div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Email</label>
                    <div className="detail-value">
                      <a href={`mailto:${selectedUser.email}`}>{selectedUser.email}</a>
                    </div>
                  </div>
                  <div className="detail-field">
                    <label>Vai trò</label>
                    <div className="detail-value">
                      <span className="role-badge">
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                  <div className="detail-field">
                    <label>Số điện thoại</label>
                    <div className="detail-value">{selectedUser.phone}</div>
                  </div>
                  <div className="detail-field">
                    <label>Ngày tham gia</label>
                    <div className="detail-value">
                      {new Date(selectedUser.joinDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <div className="detail-field">
                    <label>Lần đăng nhập cuối</label>
                    <div className="detail-value">{selectedUser.lastLogin}</div>
                  </div>
                  <div className="detail-field">
                    <label>Trạng thái</label>
                    <div className="detail-value">
                      {getStatusText(selectedUser.status)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className={`btn-large ${selectedUser.status === 'active' ? 'btn-lock-large' : 'btn-unlock-large'}`}
                  onClick={() => {
                    handleToggleLock(selectedUser.id)
                    closeDetail()
                  }}
                >
                  {selectedUser.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                </button>
                <button className="btn-large btn-close" onClick={closeDetail}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SystemAdminLayout>
  )
}
