from app.services.geocoding_service import calculate_distance, geocode_address

# ===== CẤU HÌNH PHÍ VẬN CHUYỂN =====

# Bảng phí theo bậc khoảng cách (max_km, fee)
SHIPPING_TIERS = [
    (5, 15000),    # 0-5km:  15.000đ
    (10, 25000),   # 5-10km: 25.000đ
]

MAX_DELIVERY_DISTANCE_KM = 10.0  # Chặn hoàn toàn > 10km để đồng bộ với hiển thị sản phẩm
WARNING_DISTANCE_KM = 5.0       # Cảnh báo khu vực xa
FREE_SHIPPING_THRESHOLD = 999999999  # Vô hiệu hóa miễn phí ship


def calculate_shipping_fee(distance_km: float, order_amount: float = 0) -> dict:
    distance_km = round(distance_km, 2)

    if distance_km > MAX_DELIVERY_DISTANCE_KM:
        return {
            "fee": None,
            "original_fee": None,
            "distance_km": distance_km,
            "zone": "blocked",
            "deliverable": False,
            "free_shipping": False,
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
            "message": "Rất tiếc, khu vực này nằm ngoài phạm vi giao hàng.",
        }

    # --- Tính phí theo bậc ---
    fee = SHIPPING_TIERS[-1][1]  # default: bậc cao nhất
    for max_km, tier_fee in SHIPPING_TIERS:
        if distance_km <= max_km:
            fee = tier_fee
            break

    # --- Xác định zone ---
    if distance_km > WARNING_DISTANCE_KM:
        zone = "warning"
        message = (
            f"Khu vực cách cửa hàng {distance_km:.1f}km — nằm ngoài vùng giao hàng tiêu chuẩn. "
            f"Thời gian giao hàng có thể lâu hơn và chất lượng thực phẩm có thể bị ảnh hưởng."
        )
    else:
        zone = "normal"
        message = f"Phí vận chuyển: {fee:,.0f}đ"

    return {
        "fee": fee,
        "original_fee": fee,
        "distance_km": distance_km,
        "zone": zone,
        "deliverable": True,
        "free_shipping": False,
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
        "message": message,
    }


async def estimate_shipping_for_store(
    db,
    store_id: int,
    address: str = None,
    lat: float = None,
    lng: float = None,
    order_amount: float = 0,
) -> dict:
    import logging
    logger = logging.getLogger(__name__)
    from app.models.store import Store

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        return {
            "deliverable": False,
            "zone": "blocked",
            "message": "Cửa hàng không tồn tại",
            "fee": None,
        }

    logger.info(f"[SHIPPING] estimate_shipping_for_store called - store_id={store_id}, address={address}, lat={lat}, lng={lng}")

    if not store.latitude or not store.longitude:
        logger.warning(f"[SHIPPING] Store {store_id} has no coordinates")
        return {
            "deliverable": False,
            "zone": "blocked",
            "message": "Cửa hàng chưa có tọa độ",
            "fee": None,
        }

    logger.info(f"[SHIPPING] Store coordinates: lat={store.latitude}, lng={store.longitude}")

    # Nếu chưa có tọa độ → geocode từ address
    if lat is None or lng is None:
        if not address:
            return {
                "deliverable": False,
                "zone": "blocked",
                "message": "Cần cung cấp địa chỉ hoặc tọa độ giao hàng",
                "fee": None,
            }
        geo = await geocode_address(address)
        logger.info(f"[SHIPPING] Geocoding result for '{address}': {geo}")
        if not geo:
            return {
                "deliverable": False,
                "zone": "blocked",
                "message": "Không tìm được tọa độ từ địa chỉ này. Vui lòng nhập chính xác hơn.",
                "fee": None,
            }
        lat, lng = geo["latitude"], geo["longitude"]

    distance = calculate_distance(store.latitude, store.longitude, lat, lng)
    logger.info(f"[SHIPPING] Distance calculated: {distance}km")
    result = calculate_shipping_fee(distance, order_amount)

    # Bổ sung thông tin store
    result["store_id"] = store.id
    result["store_name"] = store.name
    result["store_address"] = store.location or ""

    return result


def calculate_shipping_fee_sync(
    db,
    store_id: int,
    shipping_address: str,
    order_amount: float = 0,
) -> dict:
    import httpx
    from app.models.store import Store
    from app.models.user import User

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store or not store.latitude or not store.longitude:
        # Store chưa có tọa độ → miễn phí (fallback)
        return {
            "fee": 15000,
            "distance_km": 0,
            "zone": "normal",
            "deliverable": True,
            "free_shipping": False,
            "message": "Không thể tính khoảng cách — phí vận chuyển cơ bản: 15.000đ",
        }

    # Geocode address synchronously
    lat, lng = None, None
    if shipping_address:
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": shipping_address,
                        "format": "json",
                        "limit": 1,
                        "countrycodes": "vn",
                    },
                    headers={"User-Agent": "SEIMS/1.0"},
                )
                data = response.json()
                if data:
                    lat = float(data[0]["lat"])
                    lng = float(data[0]["lon"])
        except Exception as e:
            print(f"Shipping geocoding error: {e}")

    if lat is None or lng is None:
        # Không geocode được → miễn phí (fallback)
        return {
            "fee": 15000,
            "distance_km": 0,
            "zone": "normal",
            "deliverable": True,
            "free_shipping": False,
            "message": "Không thể xác định vị trí — phí vận chuyển cơ bản: 15.000đ",
        }

    distance = calculate_distance(store.latitude, store.longitude, lat, lng)
    return calculate_shipping_fee(distance, order_amount)
