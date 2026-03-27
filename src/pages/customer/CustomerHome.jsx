import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ShoppingCart, Tag, TrendingDown, Clock, Package, DollarSign } from "lucide-react";
import { mockProducts } from "../../services/mockProducts";

const CustomerHome = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');

  const filtered = mockProducts.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Stats calculations
  const totalProducts = mockProducts.length;
  const avgDiscount = Math.round(mockProducts.reduce((sum, p) => sum + p.discount, 0) / totalProducts);
  const expiringSoon = mockProducts.filter(p => p.daysLeft <= 2).length;
  const totalSavings = mockProducts.reduce((sum, p) => sum + (p.originalPrice - p.salePrice), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-800">Xin chào, Khách hàng! 👋</h1>
        <p className="text-gray-500 mt-2">Khám phá các sản phẩm cận hạn với giá ưu đãi</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold">Sản phẩm khả dụng</p>
              <h3 className="text-4xl font-black mt-2">{totalProducts}</h3>
              <p className="text-blue-100 text-xs mt-2">Đang giảm giá</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Package size={32} />
            </div>
          </div>
        </div>

        {/* Average Discount */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-semibold">Giảm giá trung bình</p>
              <h3 className="text-4xl font-black mt-2">{avgDiscount}%</h3>
              <p className="text-green-100 text-xs mt-2">Tiết kiệm lớn</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <TrendingDown size={32} />
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-semibold">Sắp hết hạn</p>
              <h3 className="text-4xl font-black mt-2">{expiringSoon}</h3>
              <p className="text-orange-100 text-xs mt-2">≤ 2 ngày</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Clock size={32} />
            </div>
          </div>
        </div>

        {/* Total Savings */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-semibold">Tiết kiệm tối đa</p>
              <h3 className="text-4xl font-black mt-2">{(totalSavings / 1000).toFixed(0)}K</h3>
              <p className="text-purple-100 text-xs mt-2">Tổng số tiền</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl border p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm cận hạn..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-2xl focus:ring-2 focus:ring-[#005a4e]/20 outline-none"
            />
          </div>
          <button className="px-6 py-3 bg-white border rounded-2xl hover:bg-gray-50 flex items-center gap-2 font-semibold transition-all">
            <Filter size={20} /> Lọc
          </button>
        </div>
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-3xl border shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">🔥 Sản phẩm cận hạn</h2>
          <p className="text-gray-500 text-sm mt-1">Đã tìm thấy {filtered.length} sản phẩm</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/customer/product/${product.id}`)}
                className="bg-white border rounded-3xl p-5 hover:shadow-xl transition-all cursor-pointer group hover:scale-105"
              >
                <div className="bg-gray-50 rounded-2xl h-40 mb-4 flex items-center justify-center overflow-hidden">
                  <img src={product.image} alt={product.name} className="mix-blend-multiply" />
                </div>

                <span className="bg-[#e6f4f1] text-[#005a4e] px-3 py-1 rounded-full text-xs font-bold">
                  {product.shop}
                </span>

                <h3 className="font-bold text-gray-800 mt-3 group-hover:text-[#005a4e] transition-colors line-clamp-2">
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 line-through text-sm">{product.originalPrice.toLocaleString()}đ</span>
                  <span className="text-[#005a4e] font-bold text-lg">{product.salePrice.toLocaleString()}đ</span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-orange-500 font-semibold flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg">
                    <Tag size={14} /> -{product.discount}%
                  </span>
                  <span className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                    <Clock size={14} /> {product.daysLeft} ngày
                  </span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('Đã thêm vào giỏ hàng!');
                  }}
                  className="w-full mt-4 bg-[#005a4e] text-white py-2.5 rounded-xl font-semibold hover:bg-[#00483d] flex items-center justify-center gap-2 transition-all"
                >
                  <ShoppingCart size={18} /> Thêm vào giỏ
                </button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;