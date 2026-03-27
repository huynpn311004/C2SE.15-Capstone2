import React from 'react';
import { Search } from 'lucide-react';

const CustomerOrders = () => {
  const tabs = ["Đang xử lý", "Đã hoàn thành", "Đã hủy"];
  
  return (
    <div className="p-8">
      <div className="flex gap-4 mb-8 border-b">
        {tabs.map((tab, idx) => (
          <button key={tab} className={`pb-4 px-2 font-bold text-sm ${idx === 0 ? 'border-b-2 border-[#005a4e] text-[#005a4e]' : 'text-gray-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2].map(item => (
          <div key={item} className="bg-white border rounded-3xl p-6 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mã đơn: ORD-2024-{item}</p>
              <h4 className="font-bold text-gray-800 mt-1">2 sản phẩm - Sữa tươi, Bánh mì...</h4>
              <p className="text-xs text-[#005a4e] mt-2 font-medium bg-[#e6f4f1] inline-block px-3 py-1 rounded-full italic">Đang vận chuyển tới bạn</p>
            </div>
            <div className="text-right">
              <p className="font-black text-lg">45.000đ</p>
              <button className="text-sm font-bold text-[#005a4e] hover:underline mt-2">Xem hành trình đơn hàng</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrders;