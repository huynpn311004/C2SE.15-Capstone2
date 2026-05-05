"""Add shipping_fee and delivery_distance columns to orders table."""
from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if columns exist
    result = conn.execute(text("SHOW COLUMNS FROM orders LIKE 'shipping_fee'"))
    has_shipping = result.fetchone()
    result2 = conn.execute(text("SHOW COLUMNS FROM orders LIKE 'delivery_distance'"))
    has_distance = result2.fetchone()

    print(f"shipping_fee exists: {has_shipping is not None}")
    print(f"delivery_distance exists: {has_distance is not None}")

    if not has_shipping:
        conn.execute(text("ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(12,2) DEFAULT 0"))
        print("Added shipping_fee column")
    else:
        print("shipping_fee already exists, skipping")

    if not has_distance:
        conn.execute(text("ALTER TABLE orders ADD COLUMN delivery_distance FLOAT DEFAULT NULL"))
        print("Added delivery_distance column")
    else:
        print("delivery_distance already exists, skipping")

    conn.commit()
    print("Migration complete!")
