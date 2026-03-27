import React from 'react';
import { Trash2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerCart = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
      <div className="flex-1 bg-white border rounded-3xl p-6 shadow-sm">
        <h3 className="text-xl font-bold mb-6 italic">Giỏ hàng của bạn (1)</h3>
        <div className="flex items-center gap-4 py-4 border-b">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl"></div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800">Sữa tươi Vinamilk 1L</h4>
            <p className="text-sm text-gray-400 italic">Cửa hàng: VinMart</p>
            <p className="text-[#005a4e] font-bold mt-1">15.000đ</p>
          </div>
          <button className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-[#005a4e] text-white p-6 rounded-3xl shadow-lg">
          <p className="opacity-80 mb-2">Tổng thanh toán</p>
          <h2 className="text-3xl font-bold mb-6">15.000đ</h2>
          <button 
            onClick={() => navigate('/customer/checkout')}
            className="w-full bg-white text-[#005a4e] py-4 rounded-2xl font-bold hover:bg-gray-100 flex items-center justify-center gap-2"
          >
            <CreditCard size={20} /> Thanh toán ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCart;