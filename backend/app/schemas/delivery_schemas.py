from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DeliveryItemResponse(BaseModel):
    id: int
    delivery_code: str
    delivery_type: Optional[str] = None
    order_id: Optional[int] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    donation_request_id: Optional[int] = None
    charity_id: Optional[int] = None
    charity_name: Optional[str] = None
    charity_phone: Optional[str] = None
    charity_address: Optional[str] = None
    receiver_name: Optional[str] = None
    store_id: int
    store_name: str
    store_address: str
    store_code: str
    supermarket_name: str
    items: str
    items_list: list
    quantity: int
    total_amount: Optional[float] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    order_status: Optional[str] = None
    donation_status: Optional[str] = None
    status: str
    assigned_at: str
    delivered_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    reward: Optional[float] = None

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


class UpdateDeliveryStatusRequest(BaseModel):
    status: str

    class Config:
        from_attributes = True


class StatusUpdateResponse(BaseModel):
    message: str
    success: bool
