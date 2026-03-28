import StaffLayout from '../../components/layout/StaffLayout'
import './Notifications.css'

const notices = [
  { id: 1, title: 'Cảnh Báo Sắp Hết Hạn', message: 'LH-001 (Sữa Chua Hy Lạp) sẽ hết hạn trong 4 ngày.', type: 'warning', time: '5 phút trước' },
  { id: 2, title: 'Có Đơn Hàng Mới', message: 'Đơn hàng DH-1004 cần được xác nhận.', type: 'info', time: '12 phút trước' },
  { id: 3, title: 'Yêu Cầu Quyên Góp', message: 'Quỹ Hy Vọng yêu cầu Sữa Tươi 1L x 20.', type: 'danger', time: '30 phút trước' },
]

function getBadgeClass(type) {
  if (type === 'warning') return 'badge-warning'
  if (type === 'danger') return 'badge-danger'
  return 'badge-info'
}

function getTypeLabel(type) {
  if (type === 'warning') return 'Cảnh Báo'
  if (type === 'danger') return 'Khẩn Cấp'
  return 'Thông Tin'
}

export default function Notifications() {
  return (
    <StaffLayout>
      <div className="notifications-page">
      {/* TOOLBAR */}
      <div className="notifications-toolbar">
        <div className="notifications-toolbar-info">
          Hiển thị {notices.length} thông báo
        </div>
      </div>

      {/* NOTIFICATION LIST */}
      <div className="notifications-card">
        <div className="notifications-list">
          {notices.map((notice) => (
            <div key={notice.id} className="notification-item">
              <div className="notification-item-info">
                <h4 className="notification-title">{notice.title}</h4>
                <p className="notification-message">{notice.message}</p>
                <p className="notification-time">{notice.time}</p>
              </div>
              <span className={`badge ${getBadgeClass(notice.type)}`}>
                {getTypeLabel(notice.type)}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </StaffLayout>
  )
}
