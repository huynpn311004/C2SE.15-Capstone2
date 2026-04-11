"""Discount policy endpoint request and response schemas."""

from pydantic import BaseModel


class DiscountPolicyItem(BaseModel):
    id: int
    supermarketId: int
    name: str
    minDaysLeft: int
    maxDaysLeft: int
    discountPercent: float
    isActive: bool
    categoryId: int | None = None
    categoryName: str | None = None
    productId: int | None = None
    productName: str | None = None
    appliesTo: str = "Tat ca san pham"


class DiscountPoliciesListResponse(BaseModel):
    items: list[DiscountPolicyItem]


class DiscountCalculationResponse(BaseModel):
    discountPercent: float
    originalPrice: float
    discountAmount: float
    finalPrice: float
    appliedLevel: str = "none"  # product, category, supermarket_default, or none
