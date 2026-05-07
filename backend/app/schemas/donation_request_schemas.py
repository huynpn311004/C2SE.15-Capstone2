from pydantic import BaseModel, Field
from datetime import datetime

# ========== Item Schemas ==========
class DonationRequestItemCreate(BaseModel):
    offer_id: int = Field(..., description="ID of the donation offer")
    quantity: int = Field(..., ge=1, description="Quantity to request")


class DonationRequestItemResponse(BaseModel):
    id: int
    offer_id: int
    product_name: str | None = None
    lot_code: str | None = None
    quantity: int
    status: str
    expiry_date: str | None = None


# ========== Create Request Schema ==========
class CreateDonationRequestRequest(BaseModel):
    note: str | None = Field(None, max_length=500, description="Optional note for the request")
    items: list[DonationRequestItemCreate] = Field(..., min_length=1, description="List of items to request")


# ========== List Response Schemas ==========
class DonationRequestListItem(BaseModel):
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
    items: list[DonationRequestListItem]


# ========== Detail Response Schema ==========
class DonationRequestDetailResponse(BaseModel):
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
    status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
