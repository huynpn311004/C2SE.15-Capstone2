from fastapi import APIRouter, Depends, HTTPException, status as http_status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.payment_schemas import (
    PaymentRequest, 
    PaymentResponse, 
    PaymentStatusResponse, 
    MomoIPNRequest, 
    SuccessResponse
)
from app.services.order_service import (
    initiate_momo_payment,
    handle_momo_ipn,
    confirm_customer_order
)

router = APIRouter(prefix="/payment", tags=["payment"])

@router.post("/orders/{order_id}/pay", response_model=PaymentResponse)
def initiate_payment(
    order_id: int,
    data: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Khởi tạo thanh toán online cho order"""
    if data.order_id != order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")
    
    # Check order belongs to user
    order = db.query("SELECT * FROM orders WHERE id = ? AND customer_id = ?").params(order_id, current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if data.payment_method != "momo":
        raise HTTPException(status_code=400, detail="Only Momo supported")
    
    try:
        result = initiate_momo_payment(db, data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/momo/ipn")
def momo_ipn(
    ipn_data: dict,  # Raw form data from Momo
    db: Session = Depends(get_db)
):
    """Momo server-to-server IPN callback (background)"""
    try:
        result = handle_momo_ipn(db, ipn_data)
        if result['success']:
            return {"resultCode": 0, "message": "success"}
        else:
            return {"resultCode": 1, "message": "failed"}
    except Exception as e:
        return {"resultCode": 1, "message": str(e)}

@router.get("/momo/return")
def momo_return(
    order_id: str,
    result_code: int,
    trans_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Momo redirect URL sau thanh toán (user browser)"""
    try:
        # Extract order_id from Momo orderId
        real_order_id = int(order_id.replace("SEIMS", ""))
        
        order = db.query(Order).filter(
            Order.id == real_order_id,
            Order.customer_id == current_user.id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        status = "paid" if result_code == 0 else "failed"
        order.payment_status = status
        order.status = "preparing" if status == "paid" else "cancelled"
        db.commit()
        
        if status == "paid":
            return SuccessResponse(message="Thanh toán thành công! Đơn hàng đang được chuẩn bị.")
        else:
            return SuccessResponse(message="Thanh toán thất bại. Vui lòng thử lại.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail="Payment processing error")

@router.get("/orders/{order_id}/payment-status", response_model=PaymentStatusResponse)
def get_payment_status(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kiểm tra trạng thái thanh toán order"""
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

