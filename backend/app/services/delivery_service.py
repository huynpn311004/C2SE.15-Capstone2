"""Delivery service layer with business logic."""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.delivery import Delivery
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.models.inventory_lot import InventoryLot
from app.models.supermarket import Supermarket
from app.core.security import get_password_hash, verify_password


# ========== Helper Functions ==========
def get_delivery_partner_user(db: Session, user_id: int):
    """Get delivery partner info and validate role."""
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
    """Get order items details."""
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
    """Calculate delivery reward based on order amount."""
    if not total_amount or total_amount < 50000:
        return 15000.0
    elif total_amount < 100000:
        return 20000.0
    elif total_amount < 200000:
        return 25000.0
    else:
        return 30000.0


def format_delivery_data(delivery: Delivery, db: Session, include_order_detail: bool = True) -> dict:
    """Format delivery data from database."""
    order = delivery.order
    if not order:
        return None

    customer = db.query(User).filter(User.id == order.customer_id).first()
    store = db.query(Store).filter(Store.id == order.store_id).first()

    # Get supermarket name
    supermarket_name = ""
    if store and store.supermarket_id:
        supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
        if supermarket:
            supermarket_name = supermarket.name

    # Get items detail
    items_str, items_list, total_quantity = get_order_items_detail(db, order.id)

    # Calculate reward
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
        "completed_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
        "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else "",
        "reward": reward,
    }


# ========== Delivery Orders ==========
def get_delivery_orders(db: Session, user_id: int) -> dict:
    """Get all delivery orders for delivery partner."""
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


def get_active_deliveries(db: Session, user_id: int) -> dict:
    """Get active delivery orders (not completed)."""
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


def get_delivery_history(db: Session, user_id: int, filter: str = "all") -> dict:
    """Get completed delivery history with optional date filter."""
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


def update_delivery_status(db: Session, delivery_id: int, new_status: str, user_id: int) -> dict:
    """Update delivery status with validation."""
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
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Các trạng thái hợp lệ: {', '.join(valid_statuses)}"
        )

    delivery.status = new_status

    if new_status == "completed":
        delivery.delivered_at = datetime.now()

        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order:
                order.status = "completed"

    db.commit()

    return {
        "message": f"Cập nhật trạng thái đơn {delivery.delivery_code} thành công!",
        "success": True
    }


def get_delivery_detail(db: Session, delivery_id: int, user_id: int) -> dict:
    """Get delivery order details."""
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


# ========== Delivery Statistics ==========
def get_delivery_stats(db: Session, user_id: int) -> dict:
    """Get delivery partner statistics."""
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

    return {
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "active_orders": active_orders,
        "total_earnings": total_earnings,
        "average_earning": average_earning,
    }


# ========== Profile Management ==========
def get_delivery_profile(db: Session, user_id: int) -> dict:
    """Get delivery partner profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()

    return {
        "id": dp.id if dp else None,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "vehicle_type": dp.vehicle_type if dp else None,
        "vehicle_plate": dp.vehicle_plate if dp else None,
        "is_active": dp.is_active if dp else False,
        "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None,
    }


def update_delivery_profile(db: Session, user_id: int, full_name: str, email: str, phone: str) -> dict:
    """Update delivery partner profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    phone = (phone or "").strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ tên không được để trống"
        )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email không được để trống"
        )

    existing = db.query(User).filter(User.email == email, User.id != user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng"
        )

    user.full_name = full_name
    user.email = email
    user.phone = phone
    db.commit()

    return {"success": True}


def change_delivery_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
    """Change delivery partner password."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    if len(new_password or "") < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự"
        )

    if not verify_password(current_password or "", user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    user.password_hash = get_password_hash(new_password)
    db.commit()

    return {"success": True, "message": "Đổi mật khẩu thành công"}
