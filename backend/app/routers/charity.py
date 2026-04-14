"""Charity router - delegates to service layer."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import charity_service
from app.schemas.charity_schemas import CreateDonationRequestRequest


router = APIRouter(prefix="/charity", tags=["charity"])


# ========== Profile Management ==========
@router.get("/profile")
def get_charity_profile(user_id: int = Query(...), db: Session = Depends(get_db)):
    return charity_service.get_charity_profile(db, user_id)


@router.put("/profile")
def update_charity_profile(
    full_name: str = Query(...),
    email: str = Query(...),
    phone: str = Query(default=""),
    org_name: str = Query(default=""),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return charity_service.update_charity_profile(db, user_id, full_name, email, phone, org_name)


@router.post("/change-password")
def change_charity_password(
    current_password: str = Query(...),
    new_password: str = Query(...),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return charity_service.change_charity_password(db, user_id, current_password, new_password)


# ========== Dashboard ==========
@router.get("/dashboard-summary")
def get_charity_dashboard_summary(user_id: int = Query(...), db: Session = Depends(get_db)):
    return charity_service.get_charity_dashboard_summary(db, user_id)


# ========== Donation Offers ==========
@router.get("/donation-offers")
def list_charity_donation_offers(user_id: int = Query(...), db: Session = Depends(get_db)):
    return charity_service.list_charity_donation_offers(db, user_id)


# ========== Donation Requests ==========
@router.post("/donation-requests")
def create_charity_donation_request(
    data: CreateDonationRequestRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return charity_service.create_charity_donation_request(db, user_id, data.offerId, data.requestQty)


@router.get("/donation-requests")
def list_charity_donation_requests(user_id: int = Query(...), db: Session = Depends(get_db)):
    return charity_service.list_charity_donation_requests(db, user_id)


@router.put("/donation-requests/{request_id}/confirm-received")
def confirm_received_donation(
    request_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return charity_service.confirm_received_donation(db, user_id, request_id)
