import re
from datetime import datetime, timedelta
from sqlalchemy import func, and_, Integer, case
from sqlalchemy.orm import Session, aliased
from fastapi import HTTPException, status

from app.models.user import User
from app.models.store import Store
from app.models.supermarket import Supermarket
from app.models.order import Order
from app.models.audit_log import AuditLog
from app.models.donation_request import DonationRequest
from app.models.donation_request_item import DonationRequestItem
from app.models.donation_offer import DonationOffer
from app.models.inventory_lot import InventoryLot
from app.models.product import Product
from app.core.audit_actions import (
    CREATE_STORE, UPDATE_STORE, DELETE_STORE,
    CREATE_STAFF, UPDATE_STAFF, DELETE_STAFF,
    LOCK_STAFF, UNLOCK_STAFF,
    ENTITY_STORE, ENTITY_USER,
)
from app.services.audit_service import log_action


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    return dict(row._mapping)


def _get_supermarket_scope(db: Session, user_id: int) -> int:
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if (user.role or "").lower() != "supermarket_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền quản lý store.",
        )

    if not user.supermarket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa được gán siêu thị.",
        )

    return int(user.supermarket_id)


def _build_store_code(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "", name.strip().lower())
    if not base:
        base = "store"
    return f"st_{base[:18]}"


def _generate_unique_store_code(db: Session, supermarket_id: int, name: str) -> str:
    candidate = _build_store_code(name)
    index = 1

    while True:
        exists = db.query(Store).filter(
            Store.supermarket_id == supermarket_id,
            Store.code == candidate
        ).first()

        if not exists:
            return candidate

        index += 1
        candidate = f"{_build_store_code(name)}_{index}"


# ========== Supermarket Profile ==========
def get_supermarket_profile(db: Session, user_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    sm = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not sm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermarket not found")

    return {
        "id": sm.id,
        "name": sm.name or "",
        "address": sm.address or "",
        "wallet_balance": float(sm.wallet_balance or 0),
        "createdAt": sm.created_at.strftime("%d/%m/%Y") if sm.created_at else "",
    }


def update_supermarket_profile(db: Session, user_id: int, name: str, address: str) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ten sieu thi khong duoc trong")

    db.query(Supermarket).filter(Supermarket.id == supermarket_id).update({
        Supermarket.name: name,
        Supermarket.address: address or None
    }, synchronize_session=False)
    db.commit()
    return {"success": True}


# ========== Store Management ==========
def list_stores(db: Session, user_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    u_alias = aliased(User)
    rows = db.query(
        Store.id,
        Store.code,
        Store.name,
        Store.location,
        Store.phone,
        Store.latitude,
        Store.longitude,
        func.count(u_alias.id).label("staff_count")
    ).outerjoin(
        u_alias,
        and_(
            u_alias.store_id == Store.id,
            u_alias.role == 'store_staff'
        )
    ).filter(
        Store.supermarket_id == supermarket_id
    ).group_by(
        Store.id, Store.code, Store.name, Store.location, Store.phone, Store.latitude, Store.longitude
    ).order_by(
        Store.id.desc()
    ).all()

    items = []
    for row in rows:
        items.append(
            {
                "id": row[0],
                "name": row[2],
                "address": row[3] or "",
                "phone": row[4] or "",
                "status": "active",
                "staffCount": int(row[7] or 0),
                "code": row[1],
                "latitude": float(row[5]) if row[5] is not None else None,
                "longitude": float(row[6]) if row[6] is not None else None,
            }
        )

    return {"items": items}


def create_store(db: Session, user_id: int, name: str, address: str = "", code: str = "", phone: str = "", latitude: float | None = None, longitude: float | None = None) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (name or "").strip()
    address = (address or "").strip()
    phone = (phone or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên store không được để trống.")

    code = (code or "").strip().lower()
    if code:
        if not re.fullmatch(r"[a-z0-9_-]{2,50}", code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã store chỉ gồm chữ thường, số, gạch dưới hoặc gạch ngang (2-50 ký tự).",
            )
    else:
        code = _generate_unique_store_code(db, supermarket_id, name)

    existing = db.query(Store.id).filter(
        Store.supermarket_id == supermarket_id,
        Store.code == code
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã store đã tồn tại.")

    # Kiểm tra trùng số điện thoại khi tạo cửa hàng (nếu có)
    if phone:
        dup_phone = db.query(Store.id).filter(
            Store.supermarket_id == supermarket_id,
            Store.phone == phone,
        ).first()
        if dup_phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số điện thoại đã được sử dụng bởi cửa hàng khác.")
    db.add(new_store)
    db.flush()
    store_id = new_store.id
    db.commit()

    new_value = {
        "code": code,
        "name": name,
        "location": address or None,
        "phone": phone or None,
        "latitude": latitude,
        "longitude": longitude,
    }

    log_action(db, user_id=user_id, store_id=store_id,
               action=CREATE_STORE, entity_type=ENTITY_STORE, entity_id=store_id,
               new_value=new_value)

    return {"success": True, "id": store_id}


def update_store(db: Session, user_id: int, store_id: int, name: str, address: str = "", phone: str = "", latitude: float | None = None, longitude: float | None = None) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (name or "").strip()
    address = (address or "").strip()
    phone = (phone or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên store không được để trống.")

    # Get old values for audit
    old_store = db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).first()
    if not old_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    old_value = {
        "name": old_store.name,
        "location": old_store.location,
        "phone": old_store.phone,
        "latitude": old_store.latitude,
        "longitude": old_store.longitude,
    }

    final_latitude = latitude if latitude is not None else old_store.latitude
    final_longitude = longitude if longitude is not None else old_store.longitude

    db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).update(
        {
            Store.name: name,
            Store.location: address or None,
            Store.phone: phone or None,
            Store.latitude: final_latitude,
            Store.longitude: final_longitude,
        },
        synchronize_session=False
    )
    db.commit()

    # Kiểm tra trùng số điện thoại khi cập nhật (nếu có thay đổi)
    if phone:
        dup_phone = db.query(Store.id).filter(
            Store.supermarket_id == supermarket_id,
            Store.phone == phone,
            Store.id != store_id
        ).first()
        if dup_phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số điện thoại đã được sử dụng bởi cửa hàng khác.")
    
    # Tiếp tục cập nhật các trường còn lại
    new_value = {
        "name": name,
        "location": address or None,
        "phone": phone or None,
        "latitude": final_latitude,
        "longitude": final_longitude,
    }

    log_action(db, user_id=user_id, store_id=store_id,
               action=UPDATE_STORE, entity_type=ENTITY_STORE, entity_id=store_id,
               old_value=old_value, new_value=new_value)

    return {"success": True}


def delete_store(db: Session, user_id: int, store_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    # Kiểm tra store tồn tại và thuộc siêu thị này
    old_store = db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).first()
    if not old_store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    # Kiểm tra nhân viên đang thuộc store
    staff_count = db.query(func.count(User.id)).filter(
        User.store_id == store_id,
        User.role == 'store_staff'
    ).scalar() or 0
    if staff_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa store đang có {staff_count} nhân viên."
        )

    # Kiểm tra đơn hàng đang xử lý
    active_orders = db.query(func.count(Order.id)).filter(
        Order.store_id == store_id,
        Order.status.in_(['pending', 'preparing', 'ready', 'shipped'])
    ).scalar() or 0
    if active_orders > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa store đang có {active_orders} đơn hàng đang xử lý."
        )

    # Kiểm tra tồn kho còn hàng
    inventory_count = db.query(func.count(InventoryLot.id)).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.qty_on_hand > 0
    ).scalar() or 0
    if inventory_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa store còn {inventory_count} lô hàng tồn kho. Vui lòng xử lý hàng trước."
        )

    # Tất cả điều kiện đã thỏa — tiến hành xóa
    db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).delete()
    db.commit()

    old_value = {
        "code": old_store.code,
        "name": old_store.name,
        "location": old_store.location,
        "phone": old_store.phone
    }
    log_action(db, user_id=user_id, store_id=store_id,
               action=DELETE_STORE, entity_type=ENTITY_STORE, entity_id=store_id,
               old_value=old_value)

    return {"success": True, "message": "Xóa store thành công"}


# ========== Staff Management ==========
def list_supermarket_staff(db: Session, user_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    rows = db.query(
        User.id,
        User.full_name,
        User.email,
        User.phone,
        User.username,
        User.role,
        User.is_active,
        Store.name.label('store_name'),
        Store.id.label('store_id'),
        User.created_at
    ).outerjoin(
        Store,
        User.store_id == Store.id
    ).filter(
        User.role == 'store_staff',
        Store.supermarket_id == supermarket_id
    ).order_by(
        User.id.desc()
    ).all()

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "fullName": row.full_name,
            "email": row.email,
            "phone": row.phone or "",
            "username": row.username,
            "role": row.role,
            "store": row.store_name or "-",
            "storeId": row.store_id or "",
            "status": "active" if row.is_active else "inactive",
            "joinDate": row.created_at.strftime("%d/%m/%Y") if row.created_at else "-",
        })

    return {"items": items}


def update_staff(db: Session, admin_id: int, staff_id: int, full_name: str, email: str, phone: str, store_id: int | None = None) -> dict:
    supermarket_id = _get_supermarket_scope(db, admin_id)

    # Ensure the staff belongs to this supermarket
    staff = db.query(User).filter(
        User.id == staff_id,
        User.role == 'store_staff'
    ).first()

    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nhân viên không tồn tại.")

    # Verify the staff's current store belongs to the admin's supermarket
    current_store = db.query(Store).filter(Store.id == staff.store_id, Store.supermarket_id == supermarket_id).first()
    if not current_store:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền quản lý nhân viên này.")

    # If changing store, verify the new store also belongs to this supermarket
    if store_id:
        new_store = db.query(Store).filter(Store.id == store_id, Store.supermarket_id == supermarket_id).first()
        if not new_store:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Store mới không hợp lệ hoặc không thuộc siêu thị của bạn.")

    # Kiểm tra email trùng với tài khoản khác
    if email:
        existing_email = db.query(User.id).filter(
            User.email == email.strip().lower(),
            User.id != staff_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã được sử dụng.")

    # Kiểm tra số điện thoại trùng với tài khoản khác
    if phone:
        existing_phone = db.query(User.id).filter(
            User.phone == phone.strip(),
            User.id != staff_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số điện thoại đã được sử dụng.")

    # Get old values for audit
    old_value = {
        "fullName": staff.full_name,
        "email": staff.email,
        "phone": staff.phone,
        "storeId": staff.store_id
    }

    # Perform update
    staff.full_name = full_name.strip()
    staff.email = email.strip().lower()
    staff.phone = phone.strip()
    if store_id:
        staff.store_id = store_id

    db.commit()

    new_value = {
        "fullName": staff.full_name,
        "email": staff.email,
        "phone": staff.phone,
        "storeId": staff.store_id
    }

    log_action(db, user_id=admin_id, store_id=staff.store_id,
               action=UPDATE_STAFF, entity_type=ENTITY_USER, entity_id=staff_id,
               old_value=old_value, new_value=new_value)

    return {"success": True}


def toggle_staff_lock(db: Session, admin_id: int, staff_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, admin_id)

    staff = db.query(User).filter(
        User.id == staff_id,
        User.role == 'store_staff'
    ).first()

    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nhân viên không tồn tại.")

    store = db.query(Store).filter(Store.id == staff.store_id, Store.supermarket_id == supermarket_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền quản lý nhân viên này.")

    next_active = 0 if staff.is_active else 1
    staff.is_active = next_active
    staff.locked_at = None if next_active == 1 else datetime.now()
    if next_active == 1:
        staff.failed_login_attempts = 0

    db.commit()

    action = UNLOCK_STAFF if next_active == 1 else LOCK_STAFF
    log_action(db, user_id=admin_id, store_id=staff.store_id,
               action=action, entity_type=ENTITY_USER, entity_id=staff_id)

    return {"success": True, "isActive": bool(next_active)}


def delete_staff(db: Session, admin_id: int, staff_id: int) -> dict:
    supermarket_id = _get_supermarket_scope(db, admin_id)

    staff = db.query(User).filter(
        User.id == staff_id,
        User.role == 'store_staff'
    ).first()

    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nhân viên không tồn tại.")

    store = db.query(Store).filter(Store.id == staff.store_id, Store.supermarket_id == supermarket_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền quản lý nhân viên này.")

    # Get values for audit before deletion
    old_value = {
        "username": staff.username,
        "fullName": staff.full_name,
        "email": staff.email,
        "storeId": staff.store_id
    }
    staff_store_id = staff.store_id

    db.delete(staff)
    db.commit()

    log_action(db, user_id=admin_id, store_id=staff_store_id,
               action=DELETE_STAFF, entity_type=ENTITY_USER, entity_id=staff_id,
               old_value=old_value)

    return {"success": True}


# ========== Audit Log ==========
def list_supermarket_audit_logs(
    db: Session,
    user_id: int,
    store_id: int | None = None,
    action: str = None,
    entity_type: str = None,
    from_date: str = None,
    to_date: str = None,
    limit: int = 200,
    offset: int = 0,
) -> dict:

    supermarket_id = _get_supermarket_scope(db, user_id)

    # Base: logs from staff in stores of this supermarket
    staff_ids_sub = db.query(User.id).join(
        Store, Store.id == User.store_id
    ).filter(
        Store.supermarket_id == supermarket_id
    ).subquery()

    # Join with User to get actor name
    q = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .filter(AuditLog.user_id.in_(db.query(staff_ids_sub.c.id)))
    )

    if store_id is not None:
        q = q.filter(AuditLog.store_id == store_id)

    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action.strip()}%"))

    if entity_type:
        q = q.filter(AuditLog.entity_type.ilike(f"%{entity_type.strip()}%"))

    if from_date:
        q = q.filter(AuditLog.created_at >= from_date)

    if to_date:
        to_date_obj = datetime.fromisoformat(to_date)
        to_date_next = to_date_obj.replace(hour=0, minute=0, second=0) + timedelta(days=1)
        q = q.filter(AuditLog.created_at < to_date_next)

    total = q.count()
    rows = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
         .limit(limit)
         .offset(offset)
         .all()
    )

    items = []
    for audit_log, user in rows:
        actor = (
            (user.full_name if user else None)
            or (user.username if user else None)
            or (user.email if user else None)
            or "System"
        )
        items.append({
            "id": audit_log.id,
            "time": audit_log.created_at.strftime("%Y-%m-%d %H:%M") if audit_log.created_at else "-",
            "actor": actor,
            "action": audit_log.action,
            "entityType": audit_log.entity_type,
            "entityId": audit_log.entity_id,
            "userId": audit_log.user_id,
            "storeId": audit_log.store_id,
            "oldValue": audit_log.old_value,
            "newValue": audit_log.new_value,
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ========== Dashboard ==========
def get_dashboard_summary(db: Session, user_id: int, period: str = "daily") -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)

    # Time range
    now = datetime.now()
    if period == "daily":
        current_from = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_from = current_from - timedelta(days=1)
        prev_to = current_from
    elif period == "weekly":
        current_from = now - timedelta(days=now.weekday())
        current_from = current_from.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_from = current_from - timedelta(days=7)
        prev_to = current_from
    else:  # monthly
        current_from = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_from = (current_from - timedelta(days=1)).replace(day=1)
        prev_to = current_from

    # --- Counts (all time for the supermarket) ---
    stores = db.query(Store).filter(Store.supermarket_id == supermarket_id).all()
    store_ids = [s.id for s in stores]
    total_stores = len(stores)

    if not store_ids:
        return {
            "period": period,
            "stats": {
                "totalStores": 0, "totalStaff": 0, "totalProducts": 0, "nearExpiry": 0,
                "totalOrders": 0, "totalRevenue": 0, "completedOrders": 0,
                "donationCount": 0, "donationProducts": 0, "walletBalance": 0,
            },
            "growth": {"orders": 0, "revenue": 0},
            "storeStats": [],
        }

    total_staff = db.query(func.count(User.id)).filter(
        User.store_id.in_(store_ids),
        User.role.in_(["store_staff", "staff"])
    ).scalar() or 0

    total_products = db.query(func.count(Product.id)).filter(
        Product.supermarket_id == supermarket_id
    ).scalar() or 0

    # --- Near expiry (expires in 7 days) ---
    expiry_threshold = now + timedelta(days=7)
    near_expiry = db.query(func.count(InventoryLot.id)).filter(
        InventoryLot.store_id.in_(store_ids),
        InventoryLot.expiry_date <= expiry_threshold,
        InventoryLot.expiry_date >= now,
        InventoryLot.qty_on_hand > 0
    ).scalar() or 0

    # --- Orders in period (exclude cancelled/expired) ---
    EXCLUDED_STATUSES = ('cancelled', 'expired')

    orders_metric = db.query(
        # Chỉ đếm đơn đang hoạt động (loại bỏ đơn hủy và hết hạn)
        func.count(Order.id).label("total_orders"),
        # Chỉ tính doanh thu từ đơn đã giao thành công
        func.coalesce(
            func.sum(case((Order.status == "completed", Order.total_amount - Order.shipping_fee), else_=0)), 0
        ).label("total_revenue"),
        func.coalesce(
            func.sum(func.cast(case((Order.status == "completed", 1), else_=0), Integer)), 0
        ).label("completed_orders"),
    ).filter(
        Order.store_id.in_(store_ids),
        Order.created_at >= current_from,
        Order.status.notin_(EXCLUDED_STATUSES),
    ).first()

    total_orders = int(orders_metric.total_orders or 0)
    total_revenue = float(orders_metric.total_revenue or 0)
    completed_orders = int(orders_metric.completed_orders or 0)

    # Previous period for growth (also exclude cancelled/expired)
    prev_orders = db.query(func.count(Order.id)).filter(
        Order.store_id.in_(store_ids),
        Order.created_at >= prev_from,
        Order.created_at < prev_to,
        Order.status.notin_(EXCLUDED_STATUSES),
    ).scalar() or 0

    prev_revenue = db.query(
        func.coalesce(func.sum(case((Order.status == "completed", Order.total_amount - Order.shipping_fee), else_=0)), 0)
    ).filter(
        Order.store_id.in_(store_ids),
        Order.created_at >= prev_from,
        Order.created_at < prev_to,
        Order.status.notin_(EXCLUDED_STATUSES),
    ).scalar() or 0

    orders_growth = round(((total_orders - int(prev_orders)) / int(prev_orders)) * 100, 1) if prev_orders else (100 if total_orders > 0 else 0)
    revenue_growth = round(((total_revenue - float(prev_revenue)) / float(prev_revenue)) * 100, 1) if prev_revenue else (100 if total_revenue > 0 else 0)

    # --- Donations in period ---
    donation_count = db.query(func.count(func.distinct(DonationRequest.id))).join(
        DonationRequestItem, DonationRequest.id == DonationRequestItem.request_id
    ).join(
        DonationOffer, DonationRequestItem.offer_id == DonationOffer.id
    ).filter(
        DonationOffer.store_id.in_(store_ids),
        DonationRequest.created_at >= current_from,
    ).scalar() or 0

    donation_products = db.query(func.coalesce(func.sum(DonationRequestItem.quantity), 0)).join(
        DonationRequest, DonationRequest.id == DonationRequestItem.request_id
    ).join(
        DonationOffer, DonationOffer.id == DonationRequestItem.offer_id
    ).filter(
        DonationOffer.store_id.in_(store_ids),
        DonationRequest.created_at >= current_from,
    ).scalar() or 0

    # Sales vs donation breakdown by store (using separate queries for accuracy)
    store_stats = []
    for s in stores:
        s_metric = db.query(
            func.count(Order.id).label("cnt"),
            func.coalesce(
                func.sum(case((Order.status == "completed", Order.total_amount - Order.shipping_fee), else_=0)), 0
            ).label("rev")
        ).filter(
            Order.store_id == s.id,
            Order.created_at >= current_from,
            Order.status.notin_(('cancelled', 'expired')),
        ).first()

        s_donations = db.query(func.count(func.distinct(DonationRequest.id))).join(
            DonationRequestItem, DonationRequest.id == DonationRequestItem.request_id
        ).join(
            DonationOffer, DonationRequestItem.offer_id == DonationOffer.id
        ).filter(DonationOffer.store_id == s.id, DonationRequest.created_at >= current_from).scalar() or 0

        store_stats.append({
            "id": s.id,
            "name": s.name,
            "orders": int(s_metric.cnt or 0),
            "revenue": float(s_metric.rev or 0),
            "donations": int(s_donations),
        })

    sm = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    wallet_balance = float(sm.wallet_balance or 0) if sm else 0.0

    return {
        "period": period,
        "stats": {
            "totalStores": int(total_stores),
            "totalStaff": int(total_staff),
            "totalProducts": int(total_products),
            "nearExpiry": int(near_expiry),
            "totalOrders": total_orders,
            "totalRevenue": total_revenue,
            "completedOrders": completed_orders,
            "donationCount": donation_count,
            "donationProducts": donation_products,
            "walletBalance": wallet_balance,
        },
        "growth": {
            "orders": orders_growth,
            "revenue": revenue_growth,
        },
        "storeStats": store_stats,
    }


def list_expiring_products(db: Session, user_id: int, days: int = 7, store_id: int | None = None) -> dict:
    from app.models.category import Category

    supermarket_id = _get_supermarket_scope(db, user_id)

    # Expiry threshold
    now = datetime.now()
    expiry_threshold = now + timedelta(days=days)

    # Base query for expiring inventory lots
    q = (
        db.query(
            InventoryLot.id.label("lot_id"),
            InventoryLot.qty_on_hand.label("quantity"),
            InventoryLot.expiry_date,
            InventoryLot.lot_code.label("lot_code"),
            Product.id.label("product_id"),
            Product.name.label("product_name"),
            Product.sku.label("product_sku"),
            Product.image_url.label("product_image"),
            Product.base_price.label("base_price"),
            Category.name.label("category_name"),
            Store.id.label("store_id"),
            Store.name.label("store_name"),
        )
        .join(Product, Product.id == InventoryLot.product_id)
        .join(Store, Store.id == InventoryLot.store_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .filter(
            Store.supermarket_id == supermarket_id,
            InventoryLot.expiry_date <= expiry_threshold,
            InventoryLot.expiry_date >= now,
            InventoryLot.qty_on_hand > 0,
        )
    )

    if store_id is not None:
        q = q.filter(Store.id == store_id)

    q = q.order_by(InventoryLot.expiry_date.asc())

    rows = q.all()

    # Calculate days remaining and group by urgency
    items = []
    critical_count = 0  # <= 3 days
    warning_count = 0   # 4-7 days
    caution_count = 0   # > 7 days

    for row in rows:
        days_remaining = (row.expiry_date - now.date()).days
        urgency = "critical" if days_remaining <= 3 else ("warning" if days_remaining <= 7 else "caution")

        if days_remaining <= 3:
            critical_count += 1
        elif days_remaining <= 7:
            warning_count += 1
        else:
            caution_count += 1

        items.append({
            "lotId": row.lot_id,
            "lotCode": row.lot_code or "-",
            "productId": row.product_id,
            "productName": row.product_name,
            "productSku": row.product_sku or "-",
            "productImage": row.product_image,
            "category": row.category_name or "-",
            "storeId": row.store_id,
            "storeName": row.store_name or "-",
            "quantity": int(row.quantity or 0),
            "basePrice": float(row.base_price or 0),
            "expiryDate": row.expiry_date.strftime("%d/%m/%Y"),
            "expiryDateRaw": row.expiry_date.isoformat(),
            "daysRemaining": days_remaining,
            "urgency": urgency,
        })

    return {
        "items": items,
        "critical": critical_count,
        "warning": warning_count,
        "caution": caution_count,
        "total": len(items)
    }


def get_wallet_transactions(db: Session, user_id: int, limit: int = 50, store_id: int | None = None) -> list:
    from app.models.wallet_transaction import WalletTransaction
    from app.models.order import Order
    from app.models.store import Store

    supermarket_id = _get_supermarket_scope(db, user_id)

    query = db.query(
        WalletTransaction.id,
        WalletTransaction.amount,
        WalletTransaction.transaction_type,
        WalletTransaction.description,
        WalletTransaction.created_at,
        WalletTransaction.reference_id,
        WalletTransaction.reference_type,
        Order.id.label("order_id"),
        Store.name.label("store_name")
    ).outerjoin(
        Order, and_(WalletTransaction.reference_id == Order.id, WalletTransaction.reference_type == 'order')
    ).outerjoin(
        Store, Order.store_id == Store.id
    ).filter(
        WalletTransaction.entity_type == 'supermarket',
        WalletTransaction.entity_id == supermarket_id
    )

    if store_id is not None:
        query = query.filter(Order.store_id == store_id)

    query = query.order_by(WalletTransaction.created_at.desc()).limit(limit)

    rows = query.all()

    results = []
    for row in rows:
        results.append({
            "id": row.id,
            "amount": float(row.amount),
            "type": row.transaction_type,
            "description": row.description,
            "createdAt": row.created_at.strftime("%H:%M %d/%m/%Y"),
            "referenceId": row.reference_id,
            "referenceType": row.reference_type,
            "orderCode": f"DH-{row.order_id}" if row.order_id else "-",
            "storeName": row.store_name or "-"
        })

    return results


# ========== Donation Monitoring ==========
def list_donation_monitoring(db: Session, user_id: int, status_filter: str = "all", store_id: int | None = None) -> dict:
    from app.models.charity_organization import CharityOrganization

    supermarket_id = _get_supermarket_scope(db, user_id)

    # Query donation requests that have items from offers in our stores
    q = (
        db.query(
            DonationRequest.id,
            DonationRequest.status,
            DonationRequest.created_at,
            DonationRequest.received_at,
            func.sum(DonationRequestItem.quantity).label("quantity"),
            func.count(DonationRequestItem.id).label("item_count"),
            func.min(Store.name).label("store"),  # Dùng min() để tránh nhân đôi khi đơn có nhiều store
            CharityOrganization.org_name.label("recipient"),
        )
        .join(DonationRequestItem, DonationRequestItem.request_id == DonationRequest.id)
        .join(DonationOffer, DonationOffer.id == DonationRequestItem.offer_id)
        .join(Store, Store.id == DonationOffer.store_id)
        .join(User, User.id == DonationRequest.charity_id)
        .join(CharityOrganization, CharityOrganization.user_id == User.id)
        .filter(Store.supermarket_id == supermarket_id)
    )

    if status_filter != "all":
        q = q.filter(DonationRequest.status == status_filter.upper())

    if store_id:
        q = q.filter(Store.id == store_id)

    q = q.group_by(
        DonationRequest.id,
        DonationRequest.status,
        DonationRequest.created_at,
        DonationRequest.received_at,
        CharityOrganization.org_name,
        # Store.name đã bỏ khỏi GROUP BY — tránh nhân đôi khi 1 đơn có items từ nhiều Store
    ).order_by(DonationRequest.created_at.desc())

    rows = q.limit(500).all()

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "status": (row.status or "").lower(),
            "date": row.created_at.strftime("%d/%m/%Y") if row.created_at else "-",
            "quantity": int(row.quantity or 0),
            "item_count": int(row.item_count or 0),
            "store": row.store or "-",
            "recipient": row.recipient or "-",
        })

    return {"items": items}


def get_donation_detail(db: Session, user_id: int, request_id: int) -> dict:
    from app.models.charity_organization import CharityOrganization

    supermarket_id = _get_supermarket_scope(db, user_id)

    # Get main request info
    q = (
        db.query(
            DonationRequest.id,
            DonationRequest.status,
            DonationRequest.created_at,
            DonationRequest.received_at,
            func.sum(DonationRequestItem.quantity).label("quantity"),
            func.count(DonationRequestItem.id).label("item_count"),
            Store.name.label("store"),
            User.full_name.label("charity_name"),
            CharityOrganization.org_name.label("recipient"),
        )
        .join(DonationRequestItem, DonationRequestItem.request_id == DonationRequest.id)
        .join(DonationOffer, DonationOffer.id == DonationRequestItem.offer_id)
        .join(Store, Store.id == DonationOffer.store_id)
        .join(User, User.id == DonationRequest.charity_id)
        .join(CharityOrganization, CharityOrganization.user_id == User.id)
        .filter(Store.supermarket_id == supermarket_id)
        .filter(DonationRequest.id == request_id)
        .group_by(
            DonationRequest.id,
            DonationRequest.status,
            DonationRequest.created_at,
            DonationRequest.received_at,
            Store.name,
            User.full_name,
            CharityOrganization.org_name,
        )
    )

    row = q.first()
    if not row:
        return None

    # Get items details
    items_q = (
        db.query(
            DonationRequestItem.id,
            DonationRequestItem.quantity,
            DonationRequestItem.status,
            Product.name.label("product_name"),
            Product.sku.label("product_sku"),
            InventoryLot.lot_code,
            InventoryLot.expiry_date,
        )
        .join(DonationOffer, DonationOffer.id == DonationRequestItem.offer_id)
        .join(InventoryLot, InventoryLot.id == DonationOffer.lot_id)
        .join(Product, Product.id == InventoryLot.product_id)
        .join(Store, Store.id == DonationOffer.store_id)
        .filter(DonationRequestItem.request_id == request_id)
        .filter(Store.supermarket_id == supermarket_id)
        .all()
    )

    items = []
    for item in items_q:
        items.append({
            "id": item.id,
            "productName": item.product_name or "-",
            "productSku": item.product_sku or "-",
            "lotCode": item.lot_code or "-",
            "quantity": int(item.quantity or 0),
            "expiryDate": item.expiry_date.strftime("%d/%m/%Y") if item.expiry_date else "-",
            "status": (item.status or "").lower(),
        })

    return {
        "id": row.id,
        "status": (row.status or "").lower(),
        "date": row.created_at.strftime("%d/%m/%Y") if row.created_at else "-",
        "receivedDate": row.received_at.strftime("%d/%m/%Y %H:%M") if row.received_at else "-",
        "quantity": int(row.quantity or 0),
        "item_count": int(row.item_count or 0),
        "store": row.store or "-",
        "charityName": row.charity_name or "-",
        "recipient": row.recipient or "-",
        "items": items,
    }