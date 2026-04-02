from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.delivery import Delivery
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.models.inventory_lot import InventoryLot


router = APIRouter(prefix="/delivery", tags=["delivery"])


# ==================== SCHEMAS ====================

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


# ==================== HELPER FUNCTIONS ====================

def get_delivery_partner_user(db: Session, user_id: int):
    """Lấy thông tin user và kiểm tra quyền delivery_partner"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )

    if user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập trang này"
        )

    dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()
    if not dp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin delivery partner"
        )

    return dp


def get_order_items_detail(db: Session, order_id: int) -> tuple:
    """Lấy chi tiết sản phẩm trong đơn hàng"""
    items = (
        db.query(OrderItem, Product)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.order_id == order_id)
        .all()
    )

    formatted_items = []
    items_list = []
    total_quantity = 0

    for item, product in items:
        item_str = f"{item.quantity} x {product.name}"
        formatted_items.append(item_str)
        items_list.append({
            "product_name": product.name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price)
        })
        total_quantity += item.quantity

    return ", ".join(formatted_items) if formatted_items else "Không có sản phẩm", items_list, total_quantity


def calculate_reward(total_amount: float) -> float:
    """Tính phí giao hàng dựa trên tổng giá trị đơn hàng"""
    if not total_amount or total_amount < 50000:
        return 15000.0
    elif total_amount < 100000:
        return 20000.0
    elif total_amount < 200000:
        return 25000.0
    else:
        return 30000.0


def format_delivery_data(delivery: Delivery, db: Session, include_order_detail: bool = True) -> dict:
    """Format dữ liệu delivery từ database"""
    order = delivery.order
    if not order:
        return None

    customer = db.query(User).filter(User.id == order.customer_id).first()
    store = db.query(Store).filter(Store.id == order.store_id).first()

    # Lấy thông tin supermarket
    supermarket_name = ""
    if store and store.supermarket_id:
        from app.models.supermarket import Supermarket
        supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
        if supermarket:
            supermarket_name = supermarket.name

    # Lấy chi tiết items
    items_str, items_list, total_quantity = get_order_items_detail(db, order.id)

    # Tính reward
    order_amount = float(order.total_amount) if order.total_amount else 0
    reward = calculate_reward(order_amount)

    return {
        "id": delivery.id,
        "delivery_code": delivery.delivery_code,
        "order_id": order.id,
        "customer_id": order.customer_id,
        "customer_name": customer.full_name if customer else "Không có",
        "customer_phone": delivery.receiver_phone or (customer.phone if customer else ""),
        "customer_address": delivery.receiver_address or "Không có địa chỉ",
        "store_id": store.id if store else 0,
        "store_name": store.name if store else "Không có",
        "store_address": store.location if store else "Không có",
        "store_code": store.code if store else "",
        "supermarket_name": supermarket_name,
        "items": items_str,
        "items_list": items_list,
        "quantity": total_quantity,
        "total_amount": order_amount,
        "payment_method": order.payment_method or "cod",
        "payment_status": order.payment_status or "pending",
        "order_status": order.status,
        "status": delivery.status,
        "assigned_at": delivery.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.assigned_at else "",
        "delivered_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
        "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else "",
        "reward": reward,
    }


# ==================== API ENDPOINTS ====================

@router.get("/orders", response_model=dict)
def get_delivery_orders(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lấy tất cả đơn giao hàng của delivery partner"""
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(Delivery.delivery_partner_id == dp.id)
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


@router.get("/orders/active", response_model=dict)
def get_active_deliveries(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lấy đơn hàng đang giao (không phải completed)"""
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_partner_id == dp.id,
            Delivery.status.in_(["assigned", "picking_up", "delivering"])
        )
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


@router.get("/history", response_model=dict)
def get_delivery_history(
    user_id: int,
    filter: str = "all",
    db: Session = Depends(get_db)
):
    """Lấy lịch sử giao hàng đã hoàn thành"""
    dp = get_delivery_partner_user(db, user_id)

    query = (
        db.query(Delivery)
        .filter(Delivery.delivery_partner_id == dp.id, Delivery.status == "completed")
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
    )

    if filter == "today":
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Delivery.delivered_at >= today)
    elif filter == "week":
        week_ago = datetime.now() - timedelta(days=7)
        query = query.filter(Delivery.delivered_at >= week_ago)
    elif filter == "month":
        month_ago = datetime.now() - timedelta(days=30)
        query = query.filter(Delivery.delivered_at >= month_ago)

    deliveries = query.order_by(Delivery.delivered_at.desc()).all()

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


@router.put("/orders/{delivery_id}/status", response_model=StatusUpdateResponse)
def update_delivery_status(
    delivery_id: int,
    status: str,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Cập nhật trạng thái giao hàng"""
    dp = get_delivery_partner_user(db, user_id)

    delivery = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.delivery_partner_id == dp.id)
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn giao hàng"
        )

    valid_statuses = ["assigned", "picking_up", "delivering", "completed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Các trạng thái hợp lệ: {', '.join(valid_statuses)}"
        )

    delivery.status = status

    if status == "completed":
        delivery.delivered_at = datetime.now()

        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order:
                order.status = "completed"

    db.commit()

    return StatusUpdateResponse(
        message=f"Cập nhật trạng thái đơn {delivery.delivery_code} thành công!",
        success=True
    )


@router.get("/orders/{delivery_id}", response_model=dict)
def get_delivery_detail(
    delivery_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lấy chi tiết một đơn giao hàng"""
    dp = get_delivery_partner_user(db, user_id)

    delivery = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.delivery_partner_id == dp.id)
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn giao hàng"
        )

    order_data = format_delivery_data(delivery, db)
    if not order_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng liên quan"
        )

    return order_data


@router.get("/stats", response_model=DeliveryStatsResponse)
def get_delivery_stats(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lấy thống kê delivery partner"""
    dp = get_delivery_partner_user(db, user_id)

    deliveries = db.query(Delivery).filter(Delivery.delivery_partner_id == dp.id).all()

    total_orders = len(deliveries)
    completed_orders = len([d for d in deliveries if d.status == "completed"])
    active_orders = len([d for d in deliveries if d.status in ["assigned", "picking_up", "delivering"]])

    total_earnings = 0.0
    for d in deliveries:
        if d.status == "completed" and d.order_id:
            order = db.query(Order).filter(Order.id == d.order_id).first()
            if order and order.total_amount:
                total_earnings += calculate_reward(float(order.total_amount))

    average_earning = total_earnings / completed_orders if completed_orders > 0 else 0

    return DeliveryStatsResponse(
        total_orders=total_orders,
        completed_orders=completed_orders,
        active_orders=active_orders,
        total_earnings=total_earnings,
        average_earning=average_earning,
    )


@router.get("/profile", response_model=DeliveryProfileResponse)
def get_delivery_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lấy thông tin profile delivery partner"""
    dp = get_delivery_partner_user(db, user_id)
    user = db.query(User).filter(User.id == user_id).first()

    return DeliveryProfileResponse(
        id=dp.id,
        user_id=user_id,
        full_name=user.full_name if user else "Không có",
        email=user.email if user else "",
        phone=dp.phone or "",
        vehicle_type=dp.vehicle_type,
        vehicle_plate=dp.vehicle_plate,
        is_active=user.is_active if user else True,
        created_at=user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user and user.created_at else None,
    )


@router.put("/profile", response_model=dict)
def update_delivery_profile(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin profile delivery partner"""
    dp = get_delivery_partner_user(db, user_id)

    if "phone" in payload:
        dp.phone = payload["phone"]
    if "vehicle_type" in payload:
        dp.vehicle_type = payload["vehicle_type"]
    if "vehicle_plate" in payload:
        dp.vehicle_plate = payload["vehicle_plate"]

    if "full_name" in payload:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.full_name = payload["full_name"]

    db.commit()

    return {"message": "Cập nhật thông tin thành công!", "success": True}


@router.post("/change-password", response_model=dict)
def change_delivery_password(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db)
):
    """Đổi mật khẩu delivery partner"""
    get_delivery_partner_user(db, user_id)

    current_password = payload.get("currentPassword") or ""
    new_password = payload.get("newPassword") or ""

    if not current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập mật khẩu hiện tại"
        )

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )

    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    user.password_hash = get_password_hash(new_password)
    db.commit()

    return {"message": "Đổi mật khẩu thành công!", "success": True}
