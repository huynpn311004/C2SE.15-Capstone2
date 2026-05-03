"""
Migration: Add coupon columns to orders table
This migration adds:
- coupon_id: FK to coupons table (nullable)
- discount_amount: Decimal for storing discount amount
"""
from sqlalchemy import text
from app.core.database import engine, SessionLocal


def upgrade():
    """Add coupon columns to orders table"""
    db = SessionLocal()
    try:
        # Check if columns already exist
        result = db.execute(text("DESCRIBE orders"))
        columns = [row[0] for row in result]
        
        # Add coupon_id column
        if 'coupon_id' not in columns:
            db.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN coupon_id BIGINT NULL,
                ADD CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) 
                REFERENCES coupons(id) ON DELETE SET NULL
            """))
            print("Added coupon_id column")
        else:
            print("coupon_id column already exists")
        
        # Add discount_amount column
        if 'discount_amount' not in columns:
            db.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN discount_amount DECIMAL(10,2) NULL DEFAULT 0
            """))
            print("Added discount_amount column")
        else:
            print("discount_amount column already exists")
        
        db.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


def downgrade():
    """Remove coupon columns from orders table"""
    db = SessionLocal()
    try:
        # Check if columns exist
        result = db.execute(text("DESCRIBE orders"))
        columns = [row[0] for row in result]
        
        if 'coupon_id' in columns:
            db.execute(text("""
                ALTER TABLE orders DROP FOREIGN KEY fk_orders_coupon
            """))
            db.execute(text("""
                ALTER TABLE orders DROP COLUMN coupon_id
            """))
            print("Dropped coupon_id column")
        
        if 'discount_amount' in columns:
            db.execute(text("""
                ALTER TABLE orders DROP COLUMN discount_amount
            """))
            print("Dropped discount_amount column")
        
        db.commit()
        print("Rollback completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Rollback failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Running migration: Add coupon columns to orders")
    upgrade()
