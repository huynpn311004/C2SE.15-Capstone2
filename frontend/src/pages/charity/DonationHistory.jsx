import React, { useState } from 'react';

const DonationHistory = () => {
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [requests, setRequests] = useState([
    { id: 101, item: "Gạo sạch", reqQty: 20, status: "Đang chờ duyệt", date: "24/03/2026", approvedDate: "-", receivedDate: "-", store: "WinMart" },
    { id: 102, item: "Sữa tươi", reqQty: 5, status: "Đã duyệt", date: "25/03/2026", approvedDate: "25/03/2026", receivedDate: "-", store: "Coop Mart" },
    { id: 103, item: "Dầu ăn", reqQty: 2, status: "Đã nhận hàng", date: "20/03/2026", approvedDate: "21/03/2026", receivedDate: "22/03/2026", store: "Lotte Mart" },
  ]);

  const filteredData = filterStatus === 'All' ? requests : requests.filter(r => r.status === filterStatus);

  return (
    <div className="admin-content-inner">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-[#134e4a]">Lịch sử & Trạng thái</h2>
        
        {/* 5. FILTER CHỨC NĂNG */}
        <div className="flex gap-2">
          <select 
            className="admin-user-btn bg-white outline-none"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="Đang chờ duyệt">Đang chờ duyệt</option>
            <option value="Đã duyệt">Đã duyệt</option>
            <option value="Đã nhận hàng">Đã nhận hàng</option>
          </select>
        </div>
      </div>

      <div className="seims-table-container shadow-sm border rounded-xl overflow-hidden bg-white">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#ccfbf1]">
              <th className="px-4 py-4 text-left text-[10px] font-bold uppercase text-[#0f766e]">Sản phẩm / Store</th>
              <th className="px-4 py-4 text-center text-[10px] font-bold uppercase text-[#0f766e]">Số lượng yêu cầu</th>
              <th className="px-4 py-4 text-center text-[10px] font-bold uppercase text-[#0f766e]">Các mốc thời gian</th>
              <th className="px-4 py-4 text-center text-[10px] font-bold uppercase text-[#0f766e]">Trạng thái</th>
              <th className="px-4 py-4 text-right text-[10px] font-bold uppercase text-[#0f766e]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredData.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-4">
                  <div className="font-bold">{req.item}</div>
                  <div className="text-xs text-gray-400">📍 {req.store}</div>
                </td>
                <td className="px-4 py-4 text-center font-bold text-teal-700">{req.reqQty}</td>
                <td className="px-4 py-4 text-center text-[11px] leading-tight">
                  <div>Yêu cầu: {req.date}</div>
                  <div className="text-blue-500">Duyệt: {req.approvedDate}</div>
                  <div className="text-green-600">Nhận: {req.receivedDate}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                    req.status === 'Đã nhận hàng' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                    req.status === 'Đã duyệt' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                    'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  {req.status === 'Đã duyệt' && (
                    <button className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-emerald-700 shadow-sm">
                      Xác nhận đã nhận
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonationHistory;