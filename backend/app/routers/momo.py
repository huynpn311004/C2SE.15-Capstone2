from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.order import Order

router = APIRouter(prefix="/api/momo", tags=["MoMo"])


# =========================
# IPN CALLBACK (MoMo gọi về)
# =========================
@router.post("/ipn")
async def momo_ipn(request: Request, db: Session = Depends(get_db)):

    data = await request.json()

    order_id = data.get("orderId")
    resultCode = data.get("resultCode")

    order = db.query(Order).filter(Order.id == int(order_id)).first()

    if not order:
        return {"message": "Order not found"}

    # SUCCESS
    if resultCode == 0:
        order.payment_status = "paid"
        order.status = "preparing"

    # FAILED
    else:
        order.payment_status = "failed"
        order.status = "cancelled"

    db.commit()

    return {"message": "OK"}