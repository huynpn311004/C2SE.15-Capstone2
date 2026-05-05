import { useState, useEffect } from 'react'
import StaffLayout from '../../components/layout/StaffLayout'
import { fetchNotifications, markNotificationRead } from '../../services/staffApi'
import './Notifications.css'

function getBadgeClass(type) {
  if (type === 'warning') return 'badge-warning'
  if (type === 'danger' || type === 'urgent') return 'badge-danger'
  return 'badge-info'
}

function getTypeLabel(type) {
  if (type === 'warning') return 'Cảnh Báo'
  if (type === 'danger' || type === 'urgent') return 'Khẩn Cấp'
  if (type === 'donation') return 'Quyên Góp'
  return 'Thông Tin'
}

export default function Notifications() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    try {
      setLoading(true)
      const data = await fetchNotifications()
      setNotices(data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id)
      setNotices((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  return (
    <StaffLayout>
      <div className="notifications-page">
        <div className="notifications-toolbar">
          <div className="notifications-toolbar-info">
            {loading ? 'Đang tải...' : `Hiển thị ${notices.length} thông báo`}
          </div>
        </div>

        <div className="notifications-card">
          <div className="notifications-list">
            {loading ? (
              <div className="empty-cell">Đang tải...</div>
            ) : notices.length > 0 ? (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`notification-item ${notice.isRead ? 'notification-read' : ''}`}
                  onClick={() => !notice.isRead && handleMarkRead(notice.id)}
                  style={{ cursor: notice.isRead ? 'default' : 'pointer' }}
                >
                  <div className="notification-item-info">
                    <h4 className="notification-title">{notice.content}</h4>
                    <p className="notification-time">{notice.createdAt}</p>
                  </div>
                  <span className={`badge ${getBadgeClass(notice.type)}`}>
                    {getTypeLabel(notice.type)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-cell">Không có thông báo nào</div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
}
