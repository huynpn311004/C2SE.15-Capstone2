"""Delivery endpoint request and response schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DeliveryItemResponse(BaseModel):
    id: int
    delivery_code: str
    order_id: int
    customer_id: int
    customer_name: str
    customer_phone: str
    customer_address: str
    store_id: int
    store_name: str
    store_address: str
    store_code: str
    supermarket_name: str
    items: str
    items_list: list
    quantity: int
    total_amount: float
    payment_method: str
    payment_status: str
    order_status: str
    status: str
    assigned_at: str
    delivered_at: Optional[str] = None
    created_at: str
    reward: float

    class Config:
        from_attributes = True


class DeliveryListResponse(BaseModel):
    items: list
    total: int

    class Config:
        from_attributes = True


class DeliveryStatsResponse(BaseModel):
    total_orders: int
    completed_orders: int
    active_orders: int
    total_earnings: float
    average_earning: float

    class Config:
        from_attributes = True


class DeliveryProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: str
    vehicle_type: Optional[str] = None
    vehicle_plate: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class StatusUpdateResponse(BaseModel):
    message: str
    success: bool
