from pydantic import BaseModel
from datetime import datetime


class CouponItem(BaseModel):
    id: int
    supermarket_id: int
    code: str
    description: str | None
    discount_percent: float
    min_amount: float | None
    max_uses: int | None
    current_uses: int
    valid_from: datetime
    valid_to: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CouponsListResponse(BaseModel):
    items: list[CouponItem]


class CreateCouponRequest(BaseModel):
    code: str
    description: str | None = None
    discount_percent: float
    min_amount: float | None = None
    max_uses: int | None = None
    valid_from: str
    valid_to: str


class UpdateCouponRequest(BaseModel):
    code: str | None = None
    description: str | None = None
    discount_percent: float | None = None
    min_amount: float | None = None
    max_uses: int | None = None
    valid_from: str | None = None
    valid_to: str | None = None
    is_active: bool | None = None
