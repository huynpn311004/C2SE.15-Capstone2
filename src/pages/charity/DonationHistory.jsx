import { useState } from 'react'
import CharityLayout from '../../components/layout/CharityLayout'
import './DonationHistory.css'

const seedRequests = [
  { id: 'YC-101', item: 'Gạo Sạch', reqQty: 20, status: 'pending', date: '24/03/2026', approvedDate: '-', receivedDate: '-', store: 'WinMart' },
  { id: 'YC-102', item: 'Sữa Tươi', reqQty: 5, status: 'approved', date: '25/03/2026', approvedDate: '25/03/2026', receivedDate: '-', store: 'Coop Mart' },
  { id: 'YC-103', item: 'Dầu Ăn', reqQty: 2, status: 'received', date: '20/03/2026', approvedDate: '21/03/2026', receivedDate: '22/03/2026', store: 'Lotte Mart' },
]

const statusBadge = {
  pending: 'badge-warning',
  approved: 'badge-info',
  received: 'badge-success',
  rejected: 'badge-danger',
}

const statusLabel = {
  pending: 'Đang Chờ',
  approved: 'Đã Duyệt',
  received: 'Đã Nhận',
  rejected: 'Từ Chối',
}

export default function DonationHistory() {
  const [requests, setRequests] = useState(seedRequests)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  function confirmReceived(id) {
    const today = new Date().toLocaleDateString('vi-VN')
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'received', receivedDate: today } : r))
  }

  return (
    <CharityLayout>
      <div className="chhistory-page">
        {/* TOOLBAR */}
        <div className="chhistory-toolbar">
          <div className="chhistory-filter-group">
            <label>Lọc theo trạng thái:</label>
            <select className="chhistory-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất Cả</option>
              <option value="pending">Đang Chờ</option>
              <option value="approved">Đã Duyệt</option>
              <option value="received">Đã Nhận</option>
              <option value="rejected">Từ Chối</option>
            </select>
          </div>
          <div className="chhistory-toolbar-info">Hiển thị {filtered.length} yêu cầu</div>
        </div>

        {/* TABLE */}
        <div className="chhistory-card">
          <div className="table-responsive">
            <table className="chhistory-table">
              <thead>
                <tr>
                  <th>Sản Phẩm / Store</th>
                  <th>SL Yêu Cầu</th>
                  <th>Các Mốc Thời Gian</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map(req => (
                    <tr key={req.id}>
                      <td>
                        <div className="chhistory-item-name">{req.item}</div>
                        <div className="chhistory-item-store">{req.store}</div>
                      </td>
                      <td className="chhistory-qty">{req.reqQty}</td>
                      <td className="chhistory-dates">
                        <div>Yêu cầu: {req.date}</div>
                        <div className="chhistory-date-approved">Duyệt: {req.approvedDate}</div>
                        <div className="chhistory-date-received">Nhận: {req.receivedDate}</div>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge[req.status]}`}>{statusLabel[req.status]}</span>
                      </td>
                      <td>
                        {req.status === 'approved' && (
                          <button
                            onClick={() => confirmReceived(req.id)}
                            className="chhistory-btn-confirm"
                          >
                            Xác Nhận Đã Nhận
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="chhistory-empty-cell">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CharityLayout>
  )
}
