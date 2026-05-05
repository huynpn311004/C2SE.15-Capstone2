"""
Migration script để thêm cột address, latitude, longitude vào bảng users và stores
Chạy: python run_migration.py
"""

from sqlalchemy import create_engine, URL, text
from dotenv import load_dotenv
import os

load_dotenv()

def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise ValueError(f"Missing environment variable: {name}")
    return value

DB_USER = get_env("DB_USER")
DB_PASSWORD = get_env("DB_PASSWORD")
DB_HOST = get_env("DB_HOST")
DB_PORT = get_env("DB_PORT", "3306")
DB_NAME = get_env("DB_NAME")

database_url = URL.create(
    drivername="mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT) if DB_PORT else 3306,
    database=DB_NAME
)

engine = create_engine(database_url, echo=False)

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

        # Thêm cột vào bảng inventory_lots
        print("\nThêm cột manufacturing_date vào bảng inventory_lots...")
        try:
            conn.execute(text("""
                ALTER TABLE inventory_lots
                ADD COLUMN manufacturing_date DATE NULL AFTER lot_code
            """))
            print("  ✓ Đã thêm cột manufacturing_date vào inventory_lots")
        except Exception as e:
            if "Duplicate column" in str(e):
                print("  ○ Cột manufacturing_date đã tồn tại trong inventory_lots")
            else:
                print(f"  ✗ Lỗi: {e}")
        # Thêm cột store_id vào bảng audit_logs
        print("\nThêm cột store_id vào bảng audit_logs...")
        try:
            conn.execute(text("""
                ALTER TABLE audit_logs
                ADD COLUMN store_id BIGINT NULL AFTER user_id
            """))
            print("  ✓ Đã thêm cột store_id vào audit_logs")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e):
                print("  ○ Cột store_id đã tồn tại trong audit_logs")
            else:
                print(f"  ✗ Lỗi: {e}")
        conn.commit()
        print("\n✓ Migration hoàn tất!")

if __name__ == "__main__":
    run_migration()
