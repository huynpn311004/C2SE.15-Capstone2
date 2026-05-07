from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services import charity_service
from app.schemas.donation_request_schemas import (
    CreateDonationRequestRequest,
    DonationRequestListResponse,
    DonationRequestDetailResponse,
)

router = APIRouter(prefix="/charity", tags=["charity"])

# ========== Profile Management ==========
@router.get("/profile")
def get_charity_profile(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return charity_service.get_charity_profile(db, current_user.id)


@router.put("/profile")
def update_charity_profile(
	full_name: str,
	email: str,
	phone: str = "",
	org_name: str = "",
	address: str = "",
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return charity_service.update_charity_profile(db, current_user.id, full_name, email, phone, org_name, address)


@router.post("/change-password")
def change_charity_password(
	current_password: str,
	new_password: str,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return charity_service.change_charity_password(db, current_user.id, current_password, new_password)


# ========== Dashboard ==========
@router.get("/dashboard-summary")
def get_charity_dashboard_summary(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return charity_service.get_charity_dashboard_summary(db, current_user.id)


# ========== Donation Offers ==========
@router.get("/donation-offers")
def list_charity_donation_offers(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return charity_service.list_charity_donation_offers(db, current_user.id)


# ========== Donation Requests ==========
@router.post("/donation-requests", response_model=dict)
def create_charity_donation_request(
	data: CreateDonationRequestRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    """Create a new donation request with multiple items."""
    return charity_service.create_charity_donation_request(
        db, current_user.id, data.items
    )


@router.get("/donation-requests", response_model=DonationRequestListResponse)
def list_charity_donation_requests(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return charity_service.list_charity_donation_requests_new(db, current_user.id)


@router.get("/donation-requests/{request_id}", response_model=DonationRequestDetailResponse)
def get_charity_donation_request_detail(
	request_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return charity_service.get_charity_donation_request_detail(db, current_user.id, request_id)


@router.put("/donation-requests/{request_id}/confirm-received")
def confirm_received_donation(
	request_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return charity_service.confirm_received_donation(db, current_user.id, request_id)
