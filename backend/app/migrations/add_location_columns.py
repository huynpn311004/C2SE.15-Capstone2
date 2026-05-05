"""
Migration script để thêm cột lat/lng vào bảng stores và users
Chạy: python -m app.migrations.add_location_columns
"""

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    with engine.connect() as conn:
        # Thêm cột vào bảng stores
        print("Thêm cột latitude, longitude vào bảng stores...")
        try:
            conn.execute(text("""
                ALTER TABLE stores
                ADD COLUMN latitude DOUBLE PRECISION NULL AFTER phone
            """))
            print("  ✓ Đã thêm cột latitude vào stores")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột latitude đã tồn tại trong stores")
            else:
                print(f"  ✗ Lỗi: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE stores
                ADD COLUMN longitude DOUBLE PRECISION NULL AFTER latitude
            """))
            print("  ✓ Đã thêm cột longitude vào stores")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột longitude đã tồn tại trong stores")
            else:
                print(f"  ✗ Lỗi: {e}")

        # Thêm cột vào bảng users
        print("\nThêm cột address, latitude, longitude vào bảng users...")
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN address VARCHAR(255) NULL AFTER phone
            """))
            print("  ✓ Đã thêm cột address vào users")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột address đã tồn tại trong users")
            else:
                print(f"  ✗ Lỗi: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN latitude DOUBLE PRECISION NULL AFTER address
            """))
            print("  ✓ Đã thêm cột latitude vào users")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột latitude đã tồn tại trong users")
            else:
                print(f"  ✗ Lỗi: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN longitude DOUBLE PRECISION NULL AFTER latitude
            """))
            print("  ✓ Đã thêm cột longitude vào users")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột longitude đã tồn tại trong users")
            else:
                print(f"  ✗ Lỗi: {e}")

        conn.commit()
        print("\n✓ Migration hoàn tất!")

if __name__ == "__main__":
    run_migration()
