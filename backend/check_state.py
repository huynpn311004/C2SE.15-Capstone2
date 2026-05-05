"""Check system state for demo."""
from app.core.database import get_db
from app.models.user import User
from app.models.store import Store
from app.models.order import Order
from app.models.delivery import Delivery
from app.models.inventory_lot import InventoryLot

db = next(get_db())

customers = db.query(User).filter(User.role == 'customer', User.is_active == True).all()
print('=== CUSTOMERS ===')
for c in customers:
    print(f'  {c.username} | {c.email} | addr={c.address}')

stores = db.query(Store).all()
print('\n=== STORES ===')
for s in stores:
    print(f'  id={s.id} | {s.name} | lat={s.latitude} lng={s.longitude}')

dps = db.query(User).filter(User.role == 'delivery_partner', User.is_active == True).all()
print('\n=== DELIVERY PARTNERS ===')
for d in dps:
    print(f'  {d.username} | {d.email}')

orders = db.query(Order).order_by(Order.id.desc()).limit(5).all()
print('\n=== RECENT ORDERS ===')
for o in orders:
    sf = getattr(o, 'shipping_fee', 'N/A')
    dd = getattr(o, 'delivery_distance', 'N/A')
    print(f'  id={o.id} | status={o.status} | payment={o.payment_status} | total={o.total_amount} | ship={sf} | dist={dd}')

deliveries = db.query(Delivery).order_by(Delivery.id.desc()).limit(5).all()
print('\n=== RECENT DELIVERIES ===')
for d in deliveries:
    print(f'  id={d.id} | order_id={d.order_id} | partner_id={d.delivery_partner_id} | status={d.status}')

# Check available products
lots = db.query(InventoryLot).filter(InventoryLot.available_quantity > 0).limit(5).all()
print('\n=== AVAILABLE INVENTORY ===')
for l in lots:
    print(f'  lot_id={l.id} | store={l.store_id} | product={l.product_id} | qty={l.available_quantity} | price={l.discounted_price or l.original_price}')
