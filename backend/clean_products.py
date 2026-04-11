"""
Script to clean up seed data
Run: python clean_products.py
"""

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.inventory_lot import InventoryLot
from app.models.product import Product
from app.models.category import Category


def clean_products():
    """Delete seed data"""
    db: Session = SessionLocal()
    
    try:
        # SKUs của sản phẩm seed
        seed_skus = [
            "GAA001", "LON001", "CAA001", "TOM001", "RAU001",
            "COC001", "NCA001", "NLC001", "CAF001", "TRA001",
            "SRM001", "KDM001", "DAG001", "TAT001",
            "GVS001", "KDT001", "BCR001",
            "DAA001", "NMM001", "MUI001",
        ]
        
        # Delete inventory lots of seed products
        inventory_deleted = 0
        for sku in seed_skus:
            product = db.query(Product).filter(Product.sku == sku).first()
            if product:
                count = db.query(InventoryLot).filter(InventoryLot.product_id == product.id).delete()
                inventory_deleted += count
        
        # Delete seed products
        products_deleted = db.query(Product).filter(Product.sku.in_(seed_skus)).delete()
        
        # Delete empty categories that were created for seed
        seed_categories = [
            "Thực phẩm tươi",
            "Đồ uống",
            "Mỹ phẩm",
            "Hàng tiêu dùng",
            "Đồ chế biến",
        ]
        
        categories_deleted = 0
        for cat_name in seed_categories:
            category = db.query(Category).filter(Category.name == cat_name).first()
            if category:
                # Check if category is empty (no products use it)
                product_count = db.query(Product).filter(Product.category_id == category.id).count()
                if product_count == 0:
                    db.delete(category)
                    categories_deleted += 1
        
        db.commit()
        
        print(f"✅ Làm sạch hoàn tất!")
        print(f"   - Xóa {inventory_deleted} inventory_lots")
        print(f"   - Xóa {products_deleted} sản phẩm")
        print(f"   - Xóa {categories_deleted} danh mục trống\n")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 Đang làm sạch dữ liệu seed...\n")
    clean_products()
