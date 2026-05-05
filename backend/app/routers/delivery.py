"""Delivery router - delegates to service layer."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
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
def get_delivery_orders(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_delivery_orders(db, current_user.id)


@router.get("/orders/active", response_model=DeliveryListResponse)
def get_active_deliveries(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_active_deliveries(db, current_user.id)


@router.get("/history", response_model=DeliveryListResponse)
def get_delivery_history(
	filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.get_delivery_history(db, current_user.id, filter)


@router.put("/orders/{delivery_id}/status", response_model=StatusUpdateResponse)
def update_delivery_status(
	delivery_id: int,
	status: str = Query(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.update_delivery_status(db, delivery_id, status, current_user.id)


@router.get("/orders/{delivery_id}", response_model=DeliveryItemResponse)
def get_delivery_detail(
	delivery_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.get_delivery_detail(db, delivery_id, current_user.id)


# ========== Statistics ==========
@router.get("/stats", response_model=DeliveryStatsResponse)
def get_delivery_stats(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_delivery_stats(db, current_user.id)


# ========== Donation Deliveries ==========
@router.get("/donations", response_model=DeliveryListResponse)
def get_donation_deliveries(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_donation_deliveries(db, current_user.id)


@router.get("/donations/active", response_model=DeliveryListResponse)
def get_active_donation_deliveries(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_active_donation_deliveries(db, current_user.id)


@router.get("/donations/history", response_model=DeliveryListResponse)
def get_donation_delivery_history(
	filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.get_donation_delivery_history(db, current_user.id, filter)


@router.get("/donations/{delivery_id}", response_model=DeliveryItemResponse)
def get_donation_delivery_detail(
	delivery_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.get_donation_delivery_detail(db, delivery_id, current_user.id)


# ========== Profile Management ==========
@router.get("/profile", response_model=DeliveryProfileResponse)
def get_delivery_profile(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return delivery_service.get_delivery_profile(db, current_user.id)


@router.put("/profile", response_model=StatusUpdateResponse)
def update_delivery_profile(
	full_name: str = Query(...),
	email: str = Query(...),
	phone: str = Query(default=""),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    delivery_service.update_delivery_profile(db, current_user.id, full_name, email, phone)
    return {"success": True}


@router.post("/change-password", response_model=StatusUpdateResponse)
def change_delivery_password(
	current_password: str = Query(...),
	new_password: str = Query(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return delivery_service.change_delivery_password(db, current_user.id, current_password, new_password)
