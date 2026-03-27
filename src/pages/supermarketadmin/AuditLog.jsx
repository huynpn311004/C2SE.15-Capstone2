import './AuditLog.css'

const seedLogs = [
  { id: 1, time: '25/03/2026 14:32', staff: 'Nguyễn Văn A', action: 'Cập nhật chính sách', detail: 'Ngưỡng sắp hết hạn: 7 → 5 ngày', type: 'policy' },
  { id: 2, time: '25/03/2026 13:15', staff: 'Trần Thị B', action: 'Override giá', detail: 'Sữa Tươi 1L: 35,000 → 28,000 VNĐ', type: 'price' },
  { id: 3, time: '25/03/2026 11:00', staff: 'Lê Văn C', action: 'Duyệt donation', detail: 'BigMart Q3 → Green Hands: 15 sản phẩm', type: 'donation' },
  { id: 4, time: '24/03/2026 16:45', staff: 'Phạm Thị D', action: 'Tạo tài khoản staff', detail: 'Tạo staff mới: Hoàng Văn E tại BigMart Q7', type: 'staff' },
  { id: 5, time: '24/03/2026 10:20', staff: 'Nguyễn Văn A', action: 'Khóa tài khoản', detail: 'Khóa staff: Hoàng Văn E (BigMart Q7)', type: 'staff' },
  { id: 6, time: '23/03/2026 09:00', staff: 'Trần Thị B', action: 'Cập nhật chính sách', detail: 'Discount sắp hết hạn: 20% → 25%', type: 'policy' },
]

const typeIcon = {
  policy: '⚙️',
  price: '💰',
  donation: '🎁',
  staff: '👤',
}

const typeBadge = {
  policy: 'badge-info',
  price: 'badge-warning',
  donation: 'badge-success',
  staff: 'badge-muted',
}

export default function AuditLog() {
  return (
    <div className="saaudit-page">
      {/* TOOLBAR */}
      <div className="saaudit-toolbar">
        <div className="saaudit-toolbar-info">Hiển thị {seedLogs.length} log</div>
      </div>

      {/* TABLE */}
      <div className="saaudit-card">
        <div className="table-responsive">
          <table className="saaudit-table">
            <thead>
              <tr>
                <th>Thời Gian</th>
                <th>Nhân Viên</th>
                <th>Hành Động</th>
                <th>Chi Tiết</th>
                <th>Loại</th>
              </tr>
            </thead>
            <tbody>
              {seedLogs.map(log => (
                <tr key={log.id}>
                  <td className="saaudit-time">{log.time}</td>
                  <td><span className="saaudit-staff">{log.staff}</span></td>
                  <td className="saaudit-action">{log.action}</td>
                  <td className="saaudit-detail">{log.detail}</td>
                  <td>
                    <div className="saaudit-type-cell">
                      <span className={`badge ${typeBadge[log.type]}`}>{typeIcon[log.type]} {log.type === 'policy' ? 'Chính Sách' : log.type === 'price' ? 'Giá' : log.type === 'donation' ? 'Donation' : 'Staff'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
