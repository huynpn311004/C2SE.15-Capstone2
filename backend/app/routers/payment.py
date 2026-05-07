from fastapi import APIRouter, Depends, HTTPException, status as http_status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.order import Order
from app.schemas.payment_schemas import (
    PaymentRequest, 
    PaymentResponse, 
    PaymentStatusResponse, 
    SuccessResponse
)
from app.services.order_service import (
    initiate_vnpay_payment,
    handle_vnpay_ipn_handler,
    handle_vnpay_return_handler,
)

router = APIRouter(prefix="/payment", tags=["payment"])

@router.post("/orders/{order_id}/pay", response_model=PaymentResponse)
def initiate_payment(
    order_id: int,
    data: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    if data.order_id != order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")
    
    # Check order belongs to user
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.customer_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if data.payment_method != "vnpay":
        raise HTTPException(status_code=400, detail="Only VNPay supported")
    
    try:
        # Lấy IP address của client
        client_ip = request.client.host if request else "127.0.0.1"
        result = initiate_vnpay_payment(db, data, client_ip)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# =======================
# VNPAY ENDPOINTS
# =======================
@router.get("/vnpay/return")
def vnpay_return(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        params = dict(request.query_params)
        result = handle_vnpay_return_handler(db, params)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Payment processing error")


@router.post("/vnpay/ipn")
async def vnpay_ipn(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        params = dict(request.query_params)
        result = handle_vnpay_ipn_handler(db, params)
        return result
    except Exception as e:
        return {"RspCode": "99", "Message": str(e)}


@router.get("/orders/{order_id}/payment-status", response_model=PaymentStatusResponse)
def get_payment_status(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.customer_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return PaymentStatusResponse(
        order_id=order.id,
        status=order.payment_status,
        payment_method=order.payment_method,
        amount=order.total_amount,
        transaction_id=getattr(order, 'transaction_id', None),
        message="Đã thanh toán COD" if order.payment_method == "cod" else None
    )
