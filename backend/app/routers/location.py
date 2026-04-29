"""
API Routes cho Location - Geocoding và Stores
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.services.geocoding_service import (
    geocode_address,
    reverse_geocode,
    calculate_distance,
    is_in_vietnam,
)
from app.models.store import Store
from app.models.supermarket import Supermarket
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/location", tags=["Location"])


# ============ Pydantic Schemas ============

class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    display_name: str


class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float


class ReverseGeocodeResponse(BaseModel):
    address: str


class StoreLocation(BaseModel):
    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    distance: Optional[float] = None

    class Config:
        from_attributes = True


class NearbyStoresResponse(BaseModel):
    stores: list[StoreLocation]
    user_lat: float
    user_lng: float


# ============ Geocoding Endpoints ============

@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_address_endpoint(request: GeocodeRequest):
    """Chuyển địa chỉ thành tọa độ (lat, lng)"""
    result = await geocode_address(request.address)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
    return GeocodeResponse(**result)


@router.post("/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode_endpoint(request: ReverseGeocodeRequest):
    """Chuyển tọa độ (lat, lng) thành địa chỉ"""
    if not is_in_vietnam(request.latitude, request.longitude):
        raise HTTPException(status_code=400, detail="Tọa độ không nằm trong Việt Nam")

    result = await reverse_geocode(request.latitude, request.longitude)
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
    return ReverseGeocodeResponse(address=result)


# ============ Store Location Endpoints ============

@router.get("/stores", response_model=list[StoreLocation])
async def get_all_stores_with_location(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = 50,
    db: Session = Depends(get_db),
):
    """Lấy danh sách cửa hàng có tọa độ"""
    stores = db.query(Store).filter(
        Store.latitude.isnot(None),
        Store.longitude.isnot(None),
    ).all()

    result = []
    for store in stores:
        store_data = StoreLocation(
            id=store.id,
            name=store.name,
            address=store.location or "",
            latitude=store.latitude,
            longitude=store.longitude,
        )

        # Nếu có tọa độ user, tính khoảng cách
        if lat is not None and lng is not None and store.latitude and store.longitude:
            distance = calculate_distance(lat, lng, store.latitude, store.longitude)
            store_data.distance = distance

            # Filter theo bán kính
            if radius_km and distance > radius_km:
                continue

        result.append(store_data)

    # Sắp xếp theo khoảng cách (gần nhất trước)
    if lat is not None and lng is not None:
        result.sort(key=lambda x: x.distance or float("inf"))

    return result


@router.get("/stores/{store_id}", response_model=StoreLocation)
async def get_store_location(
    store_id: int,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Lấy thông tin vị trí của một cửa hàng"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Cửa hàng không tồn tại")

    if not store.latitude or not store.longitude:
        raise HTTPException(status_code=400, detail="Cửa hàng chưa có tọa độ")

    store_data = StoreLocation(
        id=store.id,
        name=store.name,
        address=store.location or "",
        latitude=store.latitude,
        longitude=store.longitude,
    )

    # Tính khoảng cách nếu có tọa độ user
    if lat is not None and lng is not None:
        store_data.distance = calculate_distance(lat, lng, store.latitude, store.longitude)

    return store_data


# ============ Store Owner - Update Location ============

class UpdateStoreLocationRequest(BaseModel):
    latitude: float
    longitude: float


@router.put("/stores/{store_id}/location")
async def update_store_location(
    store_id: int,
    request: UpdateStoreLocationRequest,
    db: Session = Depends(get_db),
):
    """Cập nhật tọa độ cửa hàng"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Cửa hàng không tồn tại")

    # Validate Vietnam bounds
    if not is_in_vietnam(request.latitude, request.longitude):
        raise HTTPException(status_code=400, detail="Tọa độ không nằm trong Việt Nam")

    store.latitude = request.latitude
    store.longitude = request.longitude
    db.commit()

    # Get address from coordinates
    address = await reverse_geocode(request.latitude, request.longitude)
    if address:
        store.location = address

    db.commit()

    return {"message": "Cập nhật tọa độ thành công", "store_id": store_id}


# ============ User Location ============

class UpdateUserLocationRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None


@router.put("/users/me/location")
async def update_user_location(
    request: UpdateUserLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cập nhật tọa độ user (customer).
    - Nếu gửi latitude/longitude: lưu trực tiếp
    - Nếu chỉ gửi address: tự động geocode để lấy tọa độ
    """
    lat = request.latitude
    lng = request.longitude

    # Nếu không có tọa độ nhưng có địa chỉ, tự động geocode
    if (lat is None or lng is None) and request.address:
        geocode_result = await geocode_address(request.address)
        if geocode_result:
            lat = geocode_result["latitude"]
            lng = geocode_result["longitude"]
            # Cập nhật địa chỉ đầy đủ từ geocoding (display_name)
            request.address = geocode_result.get("display_name", request.address)
        else:
            raise HTTPException(
                status_code=400,
                detail="Không tìm được tọa độ từ địa chỉ này"
            )

    # Validate tọa độ cuối cùng
    if lat is None or lng is None:
        raise HTTPException(
            status_code=400,
            detail="Cần cung cấp tọa độ (latitude, longitude) hoặc địa chỉ"
        )

    # Validate Vietnam bounds
    if not is_in_vietnam(lat, lng):
        raise HTTPException(status_code=400, detail="Tọa độ không nằm trong Việt Nam")

    current_user.latitude = lat
    current_user.longitude = lng

    # Lưu địa chỉ nếu được gửi kèm hoặc từ geocoding
    if request.address:
        current_user.address = request.address

    db.commit()

    return {
        "message": "Cập nhật vị trí thành công",
        "latitude": lat,
        "longitude": lng,
        "address": request.address,
    }


# ============ Distance Calculation ============

class DistanceRequest(BaseModel):
    lat1: float
    lng1: float
    lat2: float
    lng2: float


class DistanceResponse(BaseModel):
    distance_km: float


@router.post("/distance", response_model=DistanceResponse)
async def calculate_distance_endpoint(request: DistanceRequest):
    """Tính khoảng cách giữa 2 điểm"""
    distance = calculate_distance(
        request.lat1, request.lng1,
        request.lat2, request.lng2,
    )
    return DistanceResponse(distance_km=distance)
