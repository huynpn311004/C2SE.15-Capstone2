import { useEffect, useState } from 'react'
import SystemAdminLayout from '../../components/layout/SystemAdminLayout'
import { deleteAdminUser, fetchAdminUsers, toggleAdminUserLock } from '../../services/adminApi'
import './UserManagement.css'

/**
 * Trang Quản lý Người dùng
 * System Admin quản lý toàn bộ người dùng: lock/unlock account
 */
export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  async function loadUsers() {
    try {
      setError('')
      const nextUsers = await fetchAdminUsers()
      setUsers(nextUsers)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể tải dữ liệu người dùng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = users.filter(user => {
    const roleMatch = filterRole === 'all' || user.role === filterRole
    const statusMatch = filterStatus === 'all' || user.status === filterStatus
    return roleMatch && statusMatch
  })

  async function handleToggleLock(id) {
    try {
      await toggleAdminUserLock(id)
      setSuccess('Cập nhật trạng thái tài khoản thành công')
      await loadUsers()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể cập nhật trạng thái tài khoản.')
    }
  }

  async function handleDeleteUser(id) {
    try {
      await deleteAdminUser(id)
      setSuccess('Xóa người dùng thành công')
      await loadUsers()
      if (selectedUser?.id === id) {
        closeDetail()
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Không thể xóa người dùng.')
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

        {error && <div className="users-alert users-alert-error">{error}</div>}
        {success && <div className="users-alert users-alert-success">{success}</div>}

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
                        <div className="users-username">{user.username}</div>
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
                      <td className="users-actions-cell">
                        <div className="users-actions">
                          <button
                            className={`users-btn-lock ${user.status === 'active' ? 'users-btn-lock-active' : 'users-btn-unlock-active'}`}
                            onClick={() => handleToggleLock(user.id)}
                            title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {user.status === 'active' ? (
                              <>
                                <svg className="users-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm7 12H7v-8h10v8Z"/>
                                </svg>
                                Khóa
                              </>
                            ) : (
                              <>
                                <svg className="users-icon" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 9h-7V7a3 3 0 0 1 5.8-1.2l1.9-.6A5 5 0 0 0 8 7v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H7v-8h10v8Z"/>
                                </svg>
                                Mở khóa
                              </>
                            )}
                          </button>
                          <button
                            className="users-btn-delete"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Xóa người dùng"
                          >
                            <svg className="users-icon" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            Xóa
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