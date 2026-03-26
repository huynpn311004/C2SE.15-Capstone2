import React, { useState } from 'react';

const DonationMarket = () => {
  // 1. Dữ liệu mẫu với trạng thái kho hàng
  const [offers, setOffers] = useState([
    { id: 1, name: "Thịt heo đóng hộp", qty: 20, exp: "15/05/2026", store: "Siêu thị Go!", status: "available" },
    { id: 2, name: "Mì tôm Hảo Hảo", qty: 0, exp: "20/06/2026", store: "Lotte Mart", status: "out_of_stock" },
    { id: 3, name: "Sữa tươi Vinamilk", qty: 10, exp: "10/04/2026", store: "WinMart", status: "pending_full" },
  ]);

  const [selectedItem, setSelectedItem] = useState(null); // Lưu item đang chọn để mở Modal
  const [requestQty, setRequestQty] = useState(1);

  // Hàm xử lý gửi Request từ Modal
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    alert(`Đã gửi yêu cầu nhận ${requestQty} sản phẩm ${selectedItem.name}`);
    setSelectedItem(null); // Đóng modal
    setRequestQty(1);
  };

  return (
    <div className="admin-content-inner">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#134e4a]">Chợ Donation Offer</h2>
        <input type="text" placeholder="Tìm sản phẩm..." className="admin-user-btn bg-white w-64" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {offers.map((item) => (
          <div key={item.id} className={`bg-white rounded-xl p-5 border ${item.qty === 0 ? 'opacity-75' : 'hover:shadow-md'} transition`}>
            {/* 2. Badge Trạng thái */}
            <div className="flex justify-between mb-3">
              {item.qty > 0 ? (
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${item.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status === 'available' ? '🟢 Available' : '🟡 Pending full'}
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded uppercase">🔴 Out of stock</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
            <p className="text-sm text-gray-500">Kho: <b>{item.qty}</b> | 📍 {item.store}</p>
            
            {/* 3. Disable button theo trạng thái */}
            <button 
              disabled={item.qty === 0}
              onClick={() => setSelectedItem(item)}
              className={`w-full mt-4 py-2 rounded-lg font-bold text-sm transition-all ${
                item.qty === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'btn-request text-white'
              }`}
              style={item.qty > 0 ? { background: 'linear-gradient(135deg, var(--seims-teal), var(--seims-teal-light))' } : {}}
            >
              {item.qty === 0 ? 'Hết hàng' : 'Gửi yêu cầu nhận hàng'}
            </button>
          </div>
        ))}
      </div>

      {/* 4. MODAL REQUEST (Hiển thị khi chọn item) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-[#134e4a]">Yêu cầu nhận hàng</h3>
            <p className="text-sm mb-4">Bạn đang yêu cầu từ: <b>{selectedItem.store}</b></p>
            
            <form onSubmit={handleSubmitRequest}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1">Số lượng muốn nhận (Tối đa: {selectedItem.qty})</label>
                <input 
                  type="number" min="1" max={selectedItem.qty} required
                  value={requestQty} onChange={(e) => setRequestQty(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold mb-1">Ghi chú (Không bắt buộc)</label>
                <textarea className="w-full border rounded-lg p-2 h-20 outline-none" placeholder="Lý do nhận hàng hoặc thời gian lấy hàng..."></textarea>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelectedItem(null)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">Hủy</button>
                <button type="submit" className="flex-1 py-2 btn-request text-white rounded-lg font-bold" style={{ background: 'var(--seims-teal)' }}>Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationMarket;