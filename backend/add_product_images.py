"""
Script để thêm hình ảnh cho các sản phẩm đã có trong database
Run: python add_product_images.py
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.product import Product


def add_product_images():
    """Thêm image_url cho các sản phẩm"""
    db: Session = SessionLocal()
    
    try:
        # Sử dụng placeholder images - bạn có thể thay bằng URL thực tế
        # Sử dụng https://placehold.co cho placeholder images
        product_images = {
            "GAA001": "https://placehold.co/400x300/f5f5dc/333333?text=Ga+tuoi",
            "LON001": "https://placehold.co/400x300/ffcccb/333333?text=Thit+lon",
            "CAA001": "https://placehold.co/400x300/add8e6/333333?text=Ca+basa",
            "TOM001": "https://placehold.co/400x300/ff6b6b/333333?text=Tom+sut",
            "RAU001": "https://placehold.co/400x300/90ee90/333333?text=Rau+cai",
            "COC001": "https://placehold.co/400x300/ff0000/ffffff?text=Coca+Cola",
            "NCA001": "https://placehold.co/400x300/ffa500/333333?text=Nuoc+cam",
            "NLC001": "https://placehold.co/400x300/87ceeb/333333?text=Nuoc+loc",
            "CAF001": "https://placehold.co/400x300/8b4513/ffffff?text=Cafe",
            "TRA001": "https://placehold.co/400x300/228b22/ffffff?text=Tra",
            "SRM001": "https://placehold.co/400x300/ffffff/333333?text=Sua+rua+mat",
            "KDM001": "https://placehold.co/400x300/ffc0cb/333333?text=Kem+duong",
            "DAG001": "https://placehold.co/400x300/0000ff/ffffff?text=Dau+gội",
            "TAT001": "https://placehold.co/400x300/ffffff/333333?text=Tay+trang",
            "GVS001": "https://placehold.co/400x300/ffffff/333333?text=Giay+VS",
            "KDT001": "https://placehold.co/400x300/ffffff/333333?text=Kem+dan+rang",
            "BCR001": "https://placehold.co/400x300/ffffff/333333?text=Ban+chải",
            "DAA001": "https://placehold.co/400x300/ffff00/333333?text=Dau+an",
            "NMM001": "https://placehold.co/400x300/8b0000/ffffff?text=Nuoc+mam",
            "MUI001": "https://placehold.co/400x300/ffffff/333333?text=Muối",
        }
        
        updated_count = 0
        
        for sku, image_url in product_images.items():
            product = db.query(Product).filter(Product.sku == sku).first()
            if product:
                if product.image_url is None or product.image_url == "":
                    product.image_url = image_url
                    updated_count += 1
                    print(f"✓ Thêm ảnh cho: {product.name} ({sku})")
                else:
                    print(f"⊘ Đã có ảnh: {product.name} ({sku})")
        
        if updated_count > 0:
            db.commit()
            print(f"\n✅ Cập nhật thành công {updated_count} sản phẩm!")
        else:
            print("\n⊘ Tất cả sản phẩm đã có hình ảnh hoặc không tìm thấy")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 Thêm hình ảnh cho sản phẩm...\n")
    add_product_images()
