import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Phone, User, Package, Truck, CheckCircle } from 'lucide-react';

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('✅ Đặt hàng thành công!');
    navigate('/customer/orders');
  };

  return (
    <div className="space-y-8">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Info Card */}
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#005a4e] to-[#00483d] text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Thông tin giao hàng</h2>
                  <p className="text-sm text-white/80 mt-1">Vui lòng điền đầy đủ thông tin</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <User size={16} className="text-[#005a4e]" /> Họ và tên *
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005a4e] focus:border-[#005a4e] outline-none transition-all"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <Phone size={16} className="text-[#005a4e]" /> Số điện thoại *
                </label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005a4e] focus:border-[#005a4e] outline-none transition-all"
                  placeholder="0901 234 567"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <MapPin size={16} className="text-[#005a4e]" /> Địa chỉ giao hàng *
                </label>
                <textarea 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005a4e] focus:border-[#005a4e] outline-none transition-all resize-none"
                  rows="3"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  📝 Ghi chú (tùy chọn)
                </label>
                <textarea 
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005a4e] focus:border-[#005a4e] outline-none transition-all resize-none"
                  rows="3"
                  placeholder="Thời gian nhận hàng, yêu cầu đặc biệt..."
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-semibold">💡 Lưu ý:</p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-5 list-disc">
                  <li>Vui lòng kiểm tra kỹ thông tin trước khi đặt hàng</li>
                  <li>Thời gian giao hàng dự kiến: 30-60 phút</li>
                  <li>Miễn phí vận chuyển cho đơn hàng cận hạn</li>
                </ul>
              </div>
            </form>
          </div>
        </div>

        {/* Order Summary - 1 column */}
        <div className="space-y-6">
          {/* Order Details Card */}
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden sticky top-8">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Đơn hàng của bạn</h3>
                  <p className="text-sm text-white/80 mt-1">1 sản phẩm</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Product Item */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={32} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 line-clamp-2">Sữa tươi Vinamilk 1L</p>
                  <p className="text-sm text-gray-500 mt-1">Số lượng: x1</p>
                  <p className="text-sm text-orange-500 font-semibold mt-1 flex items-center gap-1">
                    🏷️ Giảm 40%
                  </p>
                </div>
                <p className="font-bold text-[#005a4e] text-lg">15.000đ</p>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-semibold">Tạm tính</span>
                  <span className="font-bold text-gray-800">15.000đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-semibold">Phí vận chuyển</span>
                  <span className="font-bold text-green-600 flex items-center gap-1">
                    <Truck size={14} /> Miễn phí
                  </span>
                </div>
                <div className="flex justify-between text-sm bg-yellow-50 -mx-6 px-6 py-3 rounded-xl">
                  <span className="text-gray-600 font-semibold">Tiết kiệm</span>
                  <span className="font-bold text-orange-600">-10.000đ</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t-2 border-dashed">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Tổng thanh toán</span>
                  <span className="text-3xl font-black text-[#005a4e]">15.000đ</span>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-[#005a4e] to-[#00483d] text-white py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg mt-6"
              >
                <CreditCard size={22} /> Xác nhận đặt hàng
              </button>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                <CheckCircle size={14} className="text-green-600" />
                <span>Giao dịch an toàn & bảo mật</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCheckout;