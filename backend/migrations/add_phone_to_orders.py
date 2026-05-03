"""
Migration: Add shipping_phone column to orders table
This migration adds:
- shipping_phone: VARCHAR(20) for storing customer's contact phone for delivery
"""
from sqlalchemy import text
from app.core.database import SessionLocal


def upgrade():
    """Add shipping_phone column to orders table"""
    db = SessionLocal()
    try:
        # Check if column already exists
        result = db.execute(text("DESCRIBE orders"))
        columns = [row[0] for row in result]
        
        if 'shipping_phone' not in columns:
            db.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN shipping_phone VARCHAR(20) NULL
            """))
            print("Added shipping_phone column")
        else:
            print("shipping_phone column already exists")
        
        db.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


def downgrade():
    """Remove shipping_phone column from orders table"""
    db = SessionLocal()
    try:
        # Check if column exists
        result = db.execute(text("DESCRIBE orders"))
        columns = [row[0] for row in result]
        
        if 'shipping_phone' in columns:
            db.execute(text("""
                ALTER TABLE orders DROP COLUMN shipping_phone
            """))
            print("Dropped shipping_phone column")
        
        db.commit()
        print("Rollback completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Rollback failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Running migration: Add shipping_phone column to orders")
    upgrade()
