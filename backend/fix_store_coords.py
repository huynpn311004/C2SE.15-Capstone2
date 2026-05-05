"""Fix store coordinates to central Da Nang for demo."""
from app.core.database import get_db
from app.models.store import Store

db = next(get_db())

# BigC-Q1 - move to central Da Nang (near Han market)
store = db.query(Store).filter(Store.id == 1).first()
if store:
    old_lat, old_lng = store.latitude, store.longitude
    store.latitude = 16.0678
    store.longitude = 108.2208
    db.commit()
    print(f"Updated Store '{store.name}': ({old_lat}, {old_lng}) -> (16.0678, 108.2208)")
    print("New location: Central Da Nang (near Han Market)")
else:
    print("Store id=1 not found")
