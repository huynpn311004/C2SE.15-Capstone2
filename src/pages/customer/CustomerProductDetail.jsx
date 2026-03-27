import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { mockProducts } from "../../services/mockProducts";

const CustomerProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = mockProducts.find(p => p.id === parseInt(id));

  if (!product) return <div>Không tìm thấy sản phẩm</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-black">
        <ArrowLeft size={20} /> Quay lại
      </button>
      
      <div className="bg-white rounded-3xl border p-8 flex flex-col md:flex-row gap-10 shadow-sm">
        <div className="flex-1 bg-gray-50 rounded-2xl flex items-center justify-center h-80">
          <img src={product.image} alt={product.name} className="mix-blend-multiply" />
        </div>
        
        <div className="flex-1">
          <span className="bg-[#e6f4f1] text-[#005a4e] px-3 py-1 rounded-full text-xs font-bold">{product.shop}</span>
          <h1 className="text-3xl font-bold text-gray-800 mt-4">{product.name}</h1>
          
          <div className="flex items-center gap-3 mt-6">
            <span className="text-gray-400 line-through text-lg">{product.originalPrice.toLocaleString()}đ</span>
            <span className="text-[#005a4e] font-bold text-3xl">{product.salePrice.toLocaleString()}đ</span>
            <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-sm font-bold">-{product.discount}%</span>
          </div>

          <div className="mt-6 p-4 bg-orange-50 rounded-2xl">
            <p className="text-orange-600 font-semibold">⏰ Còn {product.daysLeft} ngày hết hạn</p>
          </div>

          <button className="w-full mt-8 bg-[#005a4e] text-white py-4 rounded-2xl font-bold hover:bg-[#00483d] flex items-center justify-center gap-2 shadow-lg">
            <ShoppingCart size={20} /> Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerProductDetail;