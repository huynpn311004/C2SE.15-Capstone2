"""Script to seed sample inventory data for stores."""
from datetime import date, datetime
from app.core.database import SessionLocal
from app.models.store import Store
from app.models.product import Product
from app.models.inventory_lot import InventoryLot


def seed_inventory():
    """Seed inventory lots for all products in all stores."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("SEEDING INVENTORY DATA")
        print("=" * 60)

        # Get all stores
        stores = db.query(Store).all()
        if not stores:
            print("No stores found. Please run seed_all_data.py first.")
            return

        print(f"Found {len(stores)} stores")

        total_created = 0
        total_skipped = 0

        for store in stores:
            print(f"\nProcessing store: {store.name} (ID: {store.id})")

            # Get products for this supermarket
            products = db.query(Product).filter(
                Product.supermarket_id == store.supermarket_id
            ).all()

            if not products:
                print(f"  No products found for supermarket_id={store.supermarket_id}")
                continue

            print(f"  Found {len(products)} products")

            for product in products:
                # Check if inventory lot already exists
                existing = db.query(InventoryLot).filter(
                    InventoryLot.store_id == store.id,
                    InventoryLot.product_id == product.id
                ).first()

                if existing:
                    total_skipped += 1
                    continue

                # Create inventory lot
                lot = InventoryLot(
                    store_id=store.id,
                    product_id=product.id,
                    lot_code=f"LOT{store.id:03d}{product.id:05d}001",
                    expiry_date=date.today().replace(year=date.today().year + 1),  # 1 year from now
                    manufacturing_date=date.today(),
                    qty_on_hand=100,  # 100 units in stock
                    qty_reserved=0,
                    status="active"
                )
                db.add(lot)
                total_created += 1

            db.commit()
            print(f"  Created inventory for {len(products)} products")

        print("\n" + "=" * 60)
        print(f"INVENTORY SEEDING COMPLETE")
        print("=" * 60)
        print(f"Total lots created: {total_created}")
        print(f"Total lots skipped (already exist): {total_skipped}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_inventory()
