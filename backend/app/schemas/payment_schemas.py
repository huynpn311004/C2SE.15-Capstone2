from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime

class PaymentRequest(BaseModel):
    order_id: int = Field(..., description="ID của đơn hàng")
    payment_method: str = Field(..., description="Phương thức thanh toán: 'vnpay'")

class PaymentResponse(BaseModel):
    payment_url: str = Field(..., description="URL thanh toán từ gateway")
    order_id: int
    qr_code: Optional[str] = None

class PaymentStatusResponse(BaseModel):
    order_id: int
    status: str  # pending, paid, failed
    payment_method: str
    amount: Decimal
    transaction_id: Optional[str] = None
    message: Optional[str] = None

class SuccessResponse(BaseModel):
    success: bool = True
    message: str

