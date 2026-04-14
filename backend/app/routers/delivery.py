"""Delivery router - delegates to service layer."""

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.delivery_schemas import (
    DeliveryItemResponse,
    DeliveryListResponse,
    DeliveryStatsResponse,
    DeliveryProfileResponse,
    UpdateDeliveryStatusRequest,
    StatusUpdateResponse,
)
from app.services import delivery_service


router = APIRouter(prefix="/delivery", tags=["delivery"])



# ========== Delivery Orders ==========
@router.get("/orders", response_model=DeliveryListResponse)
def get_delivery_orders(user_id: int = Query(...), db: Session = Depends(get_db)):
    return delivery_service.get_delivery_orders(db, user_id)


@router.get("/orders/active", response_model=DeliveryListResponse)
def get_active_deliveries(user_id: int = Query(...), db: Session = Depends(get_db)):
    return delivery_service.get_active_deliveries(db, user_id)


@router.get("/history", response_model=DeliveryListResponse)
def get_delivery_history(
    user_id: int = Query(...), 
    filter: str = Query(default="all"),
    db: Session = Depends(get_db),
):
    return delivery_service.get_delivery_history(db, user_id, filter)


@router.put("/orders/{delivery_id}/status", response_model=StatusUpdateResponse)
def update_delivery_status(
    delivery_id: int,
    status: str = Query(...),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return delivery_service.update_delivery_status(db, delivery_id, status, user_id)


@router.get("/orders/{delivery_id}", response_model=DeliveryItemResponse)
def get_delivery_detail(
    delivery_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return delivery_service.get_delivery_detail(db, delivery_id, user_id)


# ========== Statistics ==========
@router.get("/stats", response_model=DeliveryStatsResponse)
def get_delivery_stats(user_id: int = Query(...), db: Session = Depends(get_db)):
    return delivery_service.get_delivery_stats(db, user_id)


# ========== Profile Management ==========
@router.get("/profile", response_model=DeliveryProfileResponse)
def get_delivery_profile(user_id: int = Query(...), db: Session = Depends(get_db)):
    return delivery_service.get_delivery_profile(db, user_id)


@router.put("/profile", response_model=StatusUpdateResponse)
def update_delivery_profile(
    full_name: str = Query(...),
    email: str = Query(...),
    phone: str = Query(default=""),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    delivery_service.update_delivery_profile(db, user_id, full_name, email, phone)
    return {"success": True}


@router.post("/change-password", response_model=StatusUpdateResponse)
def change_delivery_password(
    current_password: str = Query(...),
    new_password: str = Query(...),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return delivery_service.change_delivery_password(db, user_id, current_password, new_password)
