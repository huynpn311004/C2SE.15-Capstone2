"""Donation Request schemas for new architecture."""

from pydantic import BaseModel, Field
from datetime import datetime


# ========== Item Schemas ==========
class DonationRequestItemCreate(BaseModel):
    """Schema for creating a donation request item."""
    offer_id: int = Field(..., description="ID of the donation offer")
    quantity: int = Field(..., ge=1, description="Quantity to request")


class DonationRequestItemResponse(BaseModel):
    """Schema for donation request item in responses."""
    id: int
    offer_id: int
    product_name: str | None = None
    lot_code: str | None = None
    quantity: int
    status: str
    expiry_date: str | None = None


# ========== Create Request Schema ==========
class CreateDonationRequestRequest(BaseModel):
    """Schema for creating a new donation request with multiple items."""
    note: str | None = Field(None, max_length=500, description="Optional note for the request")
    items: list[DonationRequestItemCreate] = Field(..., min_length=1, description="List of items to request")


# ========== List Response Schemas ==========
class DonationRequestListItem(BaseModel):
    """Schema for donation request in list view."""
    id: int
    charity_id: int
    charity_name: str | None = None
    charity_org_name: str | None = None
    charity_phone: str | None = None
    charity_address: str | None = None
    status: str
    total_items: int
    created_at: str
    received_at: str | None = None


class DonationRequestListResponse(BaseModel):
    """Schema for list of donation requests."""
    items: list[DonationRequestListItem]


# ========== Detail Response Schema ==========
class DonationRequestDetailResponse(BaseModel):
    """Schema for detailed donation request view."""
    id: int
    charity_id: int
    charity_name: str | None = None
    charity_org_name: str | None = None
    charity_phone: str | None = None
    charity_address: str | None = None
    status: str
    total_items: int
    created_at: str
    received_at: str | None = None
    items: list[DonationRequestItemResponse]


# ========== Status Update Schema ==========
class UpdateDonationRequestStatusRequest(BaseModel):
    """Schema for updating donation request status."""
    status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
