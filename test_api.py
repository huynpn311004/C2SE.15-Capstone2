"""Check products with images."""
import requests

BASE_URL = "http://127.0.0.1:8000/api"

for uid in range(1, 30):
    try:
        r = requests.get(f"{BASE_URL}/staff/products", params={"user_id": uid}, timeout=5)
        if r.status_code == 200:
            items = r.json().get('items', [])
            if items:
                for item in items:
                    if item.get('imageUrl'):
                        print(f"ID:{item['id']} | {item['name']} | imageUrl: {item['imageUrl']}")
    except:
        pass
print("Done")
