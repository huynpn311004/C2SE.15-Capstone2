"""Script to seed sample supermarket, stores, staff, categories and products data."""
from datetime import datetime
from decimal import Decimal
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.supermarket import Supermarket
from app.models.store import Store
from app.models.user import User
from app.models.category import Category
from app.models.product import Product


def seed_all_data():
    """Seed all sample data for the application."""
    db = SessionLocal()

    try:
        # ============================================================
        # 1. CREATE SUPERMARKETS
        # ============================================================
        supermarkets_data = [
            {
                "name": "Co.opmart Đại Quang",
                "address": "123 Đường Đại Quang, Quận Ninh Kiều, TP Cần Thơ",
                "latitude": 10.0344,
                "longitude": 105.7872,
            },
            {
                "name": "Co.opmart Thới Long",
                "address": "456 Đường Thới Long, Quận Ô Môn, TP Cần Thơ",
                "latitude": 10.0522,
                "longitude": 105.7456,
            },
            {
                "name": "Co.opmart Cái Khế",
                "address": "789 Đường Nguyễn Văn Linh, Quận Ninh Kiều, TP Cần Thơ",
                "latitude": 10.0289,
                "longitude": 105.7834,
            },
            {
                "name": "Co.opmart Hùng Vương",
                "address": "321 Đường Hùng Vương, Quận Ninh Kiều, TP Cần Thơ",
                "latitude": 10.0367,
                "longitude": 105.7891,
            },
        ]

        print("=" * 60)
        print("1. CREATING SUPERMARKETS")
        print("=" * 60)

        created_supermarkets = []
        for sm_data in supermarkets_data:
            existing = db.query(Supermarket).filter(Supermarket.name == sm_data["name"]).first()
            if existing:
                print(f"Supermarket '{sm_data['name']}' already exists (ID: {existing.id})")
                created_supermarkets.append(existing)
            else:
                new_sm = Supermarket(**sm_data)
                db.add(new_sm)
                db.flush()
                print(f"Created supermarket: {sm_data['name']} (ID: {new_sm.id})")
                created_supermarkets.append(new_sm)

        db.commit()

        # ============================================================
        # 2. CREATE STORES FOR EACH SUPERMARKET
        # ============================================================
        print("\n" + "=" * 60)
        print("2. CREATING STORES")
        print("=" * 60)

        stores_data = []
        for sm in created_supermarkets:
            sm_stores = [
                {
                    "supermarket_id": sm.id,
                    "code": f"{sm.id}001",
                    "name": f"Cửa hàng trung tâm - {sm.name}",
                    "location": sm.address,
                    "phone": f"0292{1000000 + sm.id}",
                    "latitude": sm.latitude + 0.001,
                    "longitude": sm.longitude + 0.001,
                },
                {
                    "supermarket_id": sm.id,
                    "code": f"{sm.id}002",
                    "name": f"Cửa hàng quận - {sm.name}",
                    "location": f"789 Đường Lộ Vòng Cung, Q. Ninh Kiều, TP Cần Thơ",
                    "phone": f"0292{1000001 + sm.id}",
                    "latitude": sm.latitude - 0.002,
                    "longitude": sm.longitude + 0.002,
                },
            ]
            stores_data.extend(sm_stores)

        created_stores = []
        for store_data in stores_data:
            existing = db.query(Store).filter(
                Store.supermarket_id == store_data["supermarket_id"],
                Store.code == store_data["code"]
            ).first()
            if existing:
                print(f"Store '{store_data['name']}' already exists (ID: {existing.id})")
                created_stores.append(existing)
            else:
                new_store = Store(**store_data)
                db.add(new_store)
                db.flush()
                print(f"Created store: {store_data['name']} (ID: {new_store.id})")
                created_stores.append(new_store)

        db.commit()

        # ============================================================
        # 3. CREATE STAFF ACCOUNTS
        # ============================================================
        print("\n" + "=" * 60)
        print("3. CREATING STAFF ACCOUNTS")
        print("=" * 60)

        # Get supermarket admin store (first store of first supermarket)
        main_store = created_stores[0] if created_stores else None

        staff_data = [
            # Supermarket Admins
            {
                "username": "admin_coopmart",
                "email": "admin@coopmart.com",
                "password": "Admin123@",
                "full_name": "Nguyễn Văn Quản Lý",
                "phone": "0901000001",
                "role": "supermarket_admin",
                "supermarket_id": created_supermarkets[0].id if len(created_supermarkets) > 0 else None,
            },
            {
                "username": "admin_thoilonng",
                "email": "admin_thoilonng@coopmart.com",
                "password": "Admin123@",
                "full_name": "Trần Thị Quản Lý",
                "phone": "0901000002",
                "role": "supermarket_admin",
                "supermarket_id": created_supermarkets[1].id if len(created_supermarkets) > 1 else None,
            },
            {
                "username": "admin_caikhe",
                "email": "admin_caikhe@coopmart.com",
                "password": "Admin123@",
                "full_name": "Lê Hoàng Quản Lý",
                "phone": "0901000003",
                "role": "supermarket_admin",
                "supermarket_id": created_supermarkets[2].id if len(created_supermarkets) > 2 else None,
            },
            # Store Staff
            {
                "username": "staff_daiquang01",
                "email": "staff_daiquang01@coopmart.com",
                "password": "Staff123@",
                "full_name": "Phạm Minh Thành",
                "phone": "0902000001",
                "role": "store_staff",
                "supermarket_id": created_supermarkets[0].id if len(created_supermarkets) > 0 else None,
                "store_id": created_stores[0].id if len(created_stores) > 0 else None,
            },
            {
                "username": "staff_daiquang02",
                "email": "staff_daiquang02@coopmart.com",
                "password": "Staff123@",
                "full_name": "Ngô Thị Hương",
                "phone": "0902000002",
                "role": "store_staff",
                "supermarket_id": created_supermarkets[0].id if len(created_supermarkets) > 0 else None,
                "store_id": created_stores[1].id if len(created_stores) > 0 else None,
            },
            {
                "username": "staff_thoilonng01",
                "email": "staff_thoilonng01@coopmart.com",
                "password": "Staff123@",
                "full_name": "Đặng Đức Mạnh",
                "phone": "0902000003",
                "role": "store_staff",
                "supermarket_id": created_supermarkets[1].id if len(created_supermarkets) > 1 else None,
                "store_id": created_stores[2].id if len(created_stores) > 2 else None,
            },
            {
                "username": "staff_caikhe01",
                "email": "staff_caikhe01@coopmart.com",
                "password": "Staff123@",
                "full_name": "Bùi Thị Lan",
                "phone": "0902000004",
                "role": "store_staff",
                "supermarket_id": created_supermarkets[2].id if len(created_supermarkets) > 2 else None,
                "store_id": created_stores[4].id if len(created_stores) > 4 else None,
            },
            # System Admin
            {
                "username": "system_admin",
                "email": "system@seims.com",
                "password": "System123@",
                "full_name": "Quản Trị Hệ Thống",
                "phone": "0909999999",
                "role": "system_admin",
                "supermarket_id": None,
                "store_id": None,
            },
        ]

        created_staff = []
        for staff in staff_data:
            existing = db.query(User).filter(
                (User.username == staff["username"]) | (User.email == staff["email"])
            ).first()
            if existing:
                print(f"Staff '{staff['username']}' already exists (ID: {existing.id})")
                created_staff.append(existing)
            else:
                password = staff.pop("password")
                new_user = User(**staff)
                new_user.password_hash = get_password_hash(password)
                db.add(new_user)
                db.flush()
                print(f"Created staff: {staff['username']} (ID: {new_user.id}, Role: {staff['role']})")
                created_staff.append(new_user)

        db.commit()

        # ============================================================
        # 4. CREATE CATEGORIES
        # ============================================================
        print("\n" + "=" * 60)
        print("4. CREATING CATEGORIES")
        print("=" * 60)

        categories_data = [
            {"name": "Rau củ quả"},
            {"name": "Thịt và hải sản"},
            {"name": "Sữa và các sản phẩm từ sữa"},
            {"name": "Bánh kẹo và đồ ăn vặt"},
            {"name": "Nước giải khát"},
            {"name": "Gạo và ngũ cốc"},
            {"name": "Dầu ăn và gia vị"},
            {"name": "Mì ăn liền và thực phẩm chế biến"},
            {"name": "Kem và đồ lạnh"},
            {"name": "Trứng"},
            {"name": "Bia và rượu"},
            {"name": "Sản phẩm chăm sóc cá nhân"},
            {"name": "Sản phẩm tẩy rửa và vệ sinh"},
            {"name": "Tã và sản phẩm cho bé"},
        ]

        created_categories = []
        for cat_data in categories_data:
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if existing:
                print(f"Category '{cat_data['name']}' already exists (ID: {existing.id})")
                created_categories.append(existing)
            else:
                new_cat = Category(**cat_data)
                db.add(new_cat)
                db.flush()
                print(f"Created category: {cat_data['name']} (ID: {new_cat.id})")
                created_categories.append(new_cat)

        db.commit()

        # ============================================================
        # 5. CREATE PRODUCTS FOR EACH SUPERMARKET
        # ============================================================
        print("\n" + "=" * 60)
        print("5. CREATING PRODUCTS")
        print("=" * 60)

        products_template = [
            # Rau củ quả (category 1)
            {"sku": "RAU001", "name": "Rau muống", "base_price": Decimal("15000.00"), "category_id": 1},
            {"sku": "RAU002", "name": "Rau cải xanh", "base_price": Decimal("12000.00"), "category_id": 1},
            {"sku": "RAU003", "name": "Cà chua", "base_price": Decimal("25000.00"), "category_id": 1},
            {"sku": "RAU004", "name": "Dưa leo", "base_price": Decimal("18000.00"), "category_id": 1},
            {"sku": "RAU005", "name": "Cà rốt", "base_price": Decimal("20000.00"), "category_id": 1},
            # Thịt và hải sản (category 2)
            {"sku": "THIT001", "name": "Thịt heo ba chỉ", "base_price": Decimal("85000.00"), "category_id": 2},
            {"sku": "THIT002", "name": "Thịt heo nạc", "base_price": Decimal("95000.00"), "category_id": 2},
            {"sku": "THIT003", "name": "Thịt gà nguyên con", "base_price": Decimal("75000.00"), "category_id": 2},
            {"sku": "THIT004", "name": "Cá basa fillet", "base_price": Decimal("120000.00"), "category_id": 2},
            {"sku": "THIT005", "name": "Tôm thẻ", "base_price": Decimal("180000.00"), "category_id": 2},
            # Sữa và sản phẩm từ sữa (category 3)
            {"sku": "SUA001", "name": "Sữa tươi Vinamilk 180ml", "base_price": Decimal("7000.00"), "category_id": 3},
            {"sku": "SUA002", "name": "Sữa đặc Ông Thọ", "base_price": Decimal("18000.00"), "category_id": 3},
            {"sku": "SUA003", "name": "Sữa chua Vinamilk", "base_price": Decimal("12000.00"), "category_id": 3},
            {"sku": "SUA004", "name": "Phô mai Con Bò Cười", "base_price": Decimal("35000.00"), "category_id": 3},
            # Bánh kẹo (category 4)
            {"sku": "BANH001", "name": "Bánh Oreo", "base_price": Decimal("25000.00"), "category_id": 4},
            {"sku": "BANH002", "name": "Kẹo sữa Halls", "base_price": Decimal("15000.00"), "category_id": 4},
            {"sku": "BANH003", "name": "Bánh Givral", "base_price": Decimal("35000.00"), "category_id": 4},
            # Nước giải khát (category 5)
            {"sku": "NUOC001", "name": "Nước suối Lavie 500ml", "base_price": Decimal("5000.00"), "category_id": 5},
            {"sku": "NUOC002", "name": "Nước ngọt Coca Cola", "base_price": Decimal("10000.00"), "category_id": 5},
            {"sku": "NUOC003", "name": "Nước cam Twister", "base_price": Decimal("15000.00"), "category_id": 5},
            {"sku": "NUOC004", "name": "Trà xanh 0 độ", "base_price": Decimal("8000.00"), "category_id": 5},
            # Gạo và ngũ cốc (category 6)
            {"sku": "GAO001", "name": "Gạo ST25 5kg", "base_price": Decimal("180000.00"), "category_id": 6},
            {"sku": "GAO002", "name": "Gạo Nàng Hương 5kg", "base_price": Decimal("145000.00"), "category_id": 6},
            {"sku": "GAO003", "name": "Yến mạch Quaker", "base_price": Decimal("75000.00"), "category_id": 6},
            # Dầu ăn và gia vị (category 7)
            {"sku": "DAU001", "name": "Dầu ăn Meizan 1L", "base_price": Decimal("35000.00"), "category_id": 7},
            {"sku": "DAU002", "name": "Nước mắm Nam Ngư", "base_price": Decimal("28000.00"), "category_id": 7},
            {"sku": "DAU003", "name": "Hắc xì dầu Maggi", "base_price": Decimal("22000.00"), "category_id": 7},
            {"sku": "DAU004", "name": "Bột ngọt Ajinomoto", "base_price": Decimal("25000.00"), "category_id": 7},
            # Mì ăn liền (category 8)
            {"sku": "MI001", "name": "Mì Hảo Hảo tôm chua cay", "base_price": Decimal("5000.00"), "category_id": 8},
            {"sku": "MI002", "name": "Mì Gấu Đỏ", "base_price": Decimal("6000.00"), "category_id": 8},
            {"sku": "MI003", "name": "Mì Kokomi", "base_price": Decimal("7000.00"), "category_id": 8},
            # Kem (category 9)
            {"sku": "KEM001", "name": "Kem Vinamilk ốc quế", "base_price": Decimal("8000.00"), "category_id": 9},
            {"sku": "KEM002", "name": "Kem Walls Magnum", "base_price": Decimal("25000.00"), "category_id": 9},
            # Trứng (category 10)
            {"sku": "TRUNG001", "name": "Trứng gà ta (vỉ 10)", "base_price": Decimal("38000.00"), "category_id": 10},
            {"sku": "TRUNG002", "name": "Trứng vịt (vỉ 10)", "base_price": Decimal("42000.00"), "category_id": 10},
            # Bia rượu (category 11)
            {"sku": "BIA001", "name": "Bia Tiger lon", "base_price": Decimal("18000.00"), "category_id": 11},
            {"sku": "BIA002", "name": "Bia Heineken lon", "base_price": Decimal("28000.00"), "category_id": 11},
            {"sku": "RUOU001", "name": "Rượu vang Đà Lạt", "base_price": Decimal("150000.00"), "category_id": 11},
            # Chăm sóc cá nhân (category 12)
            {"sku": "VSMY001", "name": "Sữa tắm Dove", "base_price": Decimal("85000.00"), "category_id": 12},
            {"sku": "VSMY002", "name": "Dầu gội Clear", "base_price": Decimal("75000.00"), "category_id": 12},
            {"sku": "VSMY003", "name": "Kem đánh răng Colgate", "base_price": Decimal("25000.00"), "category_id": 12},
            # Tẩy rửa (category 13)
            {"sku": "VSSACH001", "name": "Nước rửa chén Sunlight", "base_price": Decimal("32000.00"), "category_id": 13},
            {"sku": "VSSACH002", "name": "Bột giặt OMO", "base_price": Decimal("145000.00"), "category_id": 13},
            {"sku": "VSSACH003", "name": "Nước lau sàn Net", "base_price": Decimal("38000.00"), "category_id": 13},
            # Tã và sản phẩm cho bé (category 14)
            {"sku": "BE001", "name": "Tã quần Huggies M", "base_price": Decimal("185000.00"), "category_id": 14},
            {"sku": "BE002", "name": "Sữa bột Grow Plus", "base_price": Decimal("385000.00"), "category_id": 14},
        ]

        for sm in created_supermarkets:
            print(f"\nProducts for {sm.name}:")
            for prod in products_template:
                existing = db.query(Product).filter(
                    Product.supermarket_id == sm.id,
                    Product.sku == prod["sku"]
                ).first()
                if existing:
                    print(f"  - {prod['name']} (SKU: {prod['sku']}) - already exists")
                else:
                    new_prod = Product(
                        supermarket_id=sm.id,
                        **prod
                    )
                    db.add(new_prod)
                    print(f"  - {prod['name']} (SKU: {prod['sku']}) - {prod['base_price']} VND")

        db.commit()

        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 60)
        print("SEEDING COMPLETE - SUMMARY")
        print("=" * 60)
        print(f"Supermarkets: {len(created_supermarkets)}")
        print(f"Stores: {len(created_stores)}")
        print(f"Staff accounts: {len(created_staff)}")
        print(f"Categories: {len(created_categories)}")
        print(f"Products per supermarket: {len(products_template)}")
        print("=" * 60)

        print("\n" + "=" * 60)
        print("STAFF ACCOUNTS FOR LOGIN")
        print("=" * 60)
        print("\n--- SYSTEM ADMIN ---")
        print("Username: system_admin")
        print("Password: System123@")
        print("Role: system_admin")

        print("\n--- SUPERMARKET ADMINS ---")
        for sm in created_supermarkets[:3]:
            print(f"\nSupermarket: {sm.name}")
            print(f"  Username: admin_{sm.name.split()[-1].lower()}")
            print(f"  Password: Admin123@")
            print(f"  Role: supermarket_admin")

        print("\n--- STORE STAFF ---")
        staff_accounts = [
            ("staff_daiquang01", "Staff123@", created_stores[0].name if created_stores else "Store 1"),
            ("staff_daiquang02", "Staff123@", created_stores[1].name if len(created_stores) > 1 else "Store 2"),
            ("staff_thoilonng01", "Staff123@", created_stores[2].name if len(created_stores) > 2 else "Store 3"),
            ("staff_caikhe01", "Staff123@", created_stores[4].name if len(created_stores) > 4 else "Store 5"),
        ]
        for username, password, store_name in staff_accounts:
            print(f"\nStore: {store_name}")
            print(f"  Username: {username}")
            print(f"  Password: {password}")
            print(f"  Role: store_staff")

        print("\n" + "=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all_data()
