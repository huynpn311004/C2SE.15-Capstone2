"""
Script to seed product data into the database
Run: python seed_products.py
"""

from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.product import Product
from app.models.category import Category
from app.models.inventory_lot import InventoryLot
from app.models.store import Store
from app.models.supermarket import Supermarket


def seed_products():
    """Seed products into database"""
    db: Session = SessionLocal()
    
    try:
        # Get first supermarket (assuming it exists)
        supermarket = db.query(Supermarket).first()
        if not supermarket:
            print("❌ Không tìm thấy supermarket trong database!")
            return
        
        supermarket_id = supermarket.id
        print(f"✓ Sử dụng Supermarket ID: {supermarket_id}")
        
        # Get first store from supermarket
        store = db.query(Store).filter(Store.supermarket_id == supermarket_id).first()
        if not store:
            print("❌ Không tìm thấy store trong supermarket này!")
            return
        
        store_id = store.id
        print(f"✓ Sử dụng Store ID: {store_id}\n")
        
        # Create categories if they don't exist
        categories_data = [
            {"name": "Thực phẩm tươi"},
            {"name": "Đồ uống"},
            {"name": "Mỹ phẩm"},
            {"name": "Hàng tiêu dùng"},
            {"name": "Đồ chế biến"},
        ]
        
        categories = {}
        for cat_data in categories_data:
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if existing:
                categories[cat_data["name"]] = existing.id
                print(f"✓ Danh mục '{cat_data['name']}' đã tồn tại (ID: {existing.id})")
            else:
                new_cat = Category(name=cat_data["name"])
                db.add(new_cat)
                db.flush()
                categories[cat_data["name"]] = new_cat.id
                print(f"✓ Tạo danh mục '{cat_data['name']}' (ID: {new_cat.id})")
        
        # Product data
        products_data = [
            # Thực phẩm tươi
            {"name": "Gà tươi nguyên con", "sku": "GAA001", "price": 89000, "category": "Thực phẩm tươi", "stock": 50},
            {"name": "Thịt lợn nạc", "sku": "LON001", "price": 72000, "category": "Thực phẩm tươi", "stock": 60},
            {"name": "Cá basa tươi", "sku": "CAA001", "price": 55000, "category": "Thực phẩm tươi", "stock": 40},
            {"name": "Tôm sú tươi", "sku": "TOM001", "price": 180000, "category": "Thực phẩm tươi", "stock": 30},
            {"name": "Rau cải xoăn", "sku": "RAU001", "price": 15000, "category": "Thực phẩm tươi", "stock": 100},
            
            # Đồ uống
            {"name": "Coca Cola 1.5L", "sku": "COC001", "price": 18900, "category": "Đồ uống", "stock": 200},
            {"name": "Nước cam tươi 1L", "sku": "NCA001", "price": 22000, "category": "Đồ uống", "stock": 80},
            {"name": "Nước lọc A.O 20L", "sku": "NLC001", "price": 16000, "category": "Đồ uống", "stock": 50},
            {"name": "Cà phê Arabica 500g", "sku": "CAF001", "price": 85000, "category": "Đồ uống", "stock": 40},
            {"name": "Trà tuyết camellia 200g", "sku": "TRA001", "price": 45000, "category": "Đồ uống", "stock": 60},
            
            # Mỹ phẩm
            {"name": "Sữa rửa mặt Cetaphil 235ml", "sku": "SRM001", "price": 125000, "category": "Mỹ phẩm", "stock": 30},
            {"name": "Kem dưỡng mặt Olay 50ml", "sku": "KDM001", "price": 95000, "category": "Mỹ phẩm", "stock": 25},
            {"name": "Dầu gội đầu Clear 370ml", "sku": "DAG001", "price": 42000, "category": "Mỹ phẩm", "stock": 70},
            {"name": "Tẩy trang Bioderma 250ml", "sku": "TAT001", "price": 118000, "category": "Mỹ phẩm", "stock": 20},
            
            # Hàng tiêu dùng
            {"name": "Giấy vệ sinh Pulppy 10 cuộn", "sku": "GVS001", "price": 68000, "category": "Hàng tiêu dùng", "stock": 150},
            {"name": "Kem đánh răng Colgate 200g", "sku": "KDT001", "price": 18000, "category": "Hàng tiêu dùng", "stock": 120},
            {"name": "Bàn chải đánh răng", "sku": "BCR001", "price": 12000, "category": "Hàng tiêu dùng", "stock": 100},
            
            # Đồ chế biến
            {"name": "Dầu ăn Tường An 2L", "sku": "DAA001", "price": 52000, "category": "Đồ chế biến", "stock": 80},
            {"name": "Nước mắm Thanh Oan 740ml", "sku": "NMM001", "price": 38000, "category": "Đồ chế biến", "stock": 90},
            {"name": "Muối iốt Tây Ninh 400g", "sku": "MUI001", "price": 8000, "category": "Đồ chế biến", "stock": 200},
        ]
        
        # Add products and inventory
        added_count = 0
        today = datetime.now()
        
        for prod_data in products_data:
            # Check if product already exists
            existing = db.query(Product).filter(
                Product.supermarket_id == supermarket_id,
                Product.sku == prod_data["sku"]
            ).first()
            
            if existing:
                print(f"⊘ Sản phẩm '{prod_data['name']}' (SKU: {prod_data['sku']}) đã tồn tại")
                continue
            
            product = Product(
                supermarket_id=supermarket_id,
                category_id=categories.get(prod_data["category"]),
                sku=prod_data["sku"],
                name=prod_data["name"],
                base_price=Decimal(str(prod_data["price"])),
                image_url=None,
            )
            db.add(product)
            db.flush()
            
            # Create inventory lot with 30 days expiry
            expiry_date = today + timedelta(days=30)
            lot_code = f"{prod_data['sku']}-{today.strftime('%Y%m%d')}"
            
            inventory = InventoryLot(
                product_id=product.id,
                store_id=store_id,
                lot_code=lot_code,
                qty_on_hand=prod_data["stock"],
                expiry_date=expiry_date.date(),
            )
            db.add(inventory)
            
            added_count += 1
            print(f"✓ Thêm: {prod_data['name']} ({prod_data['sku']}) - {prod_data['price']:,}đ - {prod_data['stock']} cái")
        
        if added_count > 0:
            db.commit()
            print(f"\n✅ Thêm thành công {added_count} sản phẩm + inventory_lots vào database!")
        else:
            print("\n⊘ Tất cả sản phẩm đã tồn tại trong database")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 Bắt đầu seed dữ liệu product...\n")
    seed_products()
