"""
Geocoding Service - Chuyển đổi địa chỉ <-> tọa độ
Sử dụng Nominatim (OpenStreetMap) API
"""
import math
from typing import Optional
import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org"


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách Haversine (km)"""
    R = 6371  # Bán kính trái đất (km)

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


async def geocode_address(address: str, country_code: str = "vn") -> Optional[dict]:
    """
    Chuyển địa chỉ thành tọa độ (lat, lng)
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{NOMINATIM_URL}/search",
                params={
                    "q": address,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": country_code,
                },
                headers={"User-Agent": "SEIMS/1.0"},
            )
            data = response.json()
            if data:
                return {
                    "latitude": float(data[0]["lat"]),
                    "longitude": float(data[0]["lon"]),
                    "display_name": data[0].get("display_name", ""),
                }
            return None
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None


async def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """
    Chuyển tọa độ (lat, lng) thành địa chỉ
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{NOMINATIM_URL}/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "json",
                },
                headers={"User-Agent": "SEIMS/1.0"},
            )
            data = response.json()
            if data and "display_name" in data:
                return data["display_name"]
            return None
    except Exception as e:
        print(f"Reverse geocoding error: {e}")
        return None


def is_in_vietnam(lat: float, lng: float) -> bool:
    """Kiểm tra tọa độ có trong Việt Nam không"""
    return 8.4 <= lat <= 23.4 and 102.1 <= lng <= 109.5
