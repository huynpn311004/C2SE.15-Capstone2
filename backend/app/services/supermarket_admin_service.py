"""Supermarket admin service layer with business logic."""

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
from app.models.donation_offer import DonationOffer
from app.models.inventory_lot import InventoryLot
from app.models.product import Product


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    """Convert SQLAlchemy row to dictionary."""
    return dict(row._mapping)


def _get_supermarket_scope(db: Session, user_id: int) -> int:
    """Get supermarket_id for supermarket admin."""
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
    """Generate store code from name."""
    base = re.sub(r"[^a-z0-9]+", "", name.strip().lower())
    if not base:
        base = "store"
    return f"st_{base[:18]}"


def _generate_unique_store_code(db: Session, supermarket_id: int, name: str) -> str:
    """Generate unique store code within supermarket."""
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
    """Get supermarket profile for the current admin."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    sm = db.query(Supermarket).filter(Supermarket.id == supermarket_id).first()
    if not sm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supermarket not found")

    return {
        "id": sm.id,
        "name": sm.name or "",
        "address": sm.address or "",
        "createdAt": sm.created_at.strftime("%d/%m/%Y") if sm.created_at else "",
    }


def update_supermarket_profile(db: Session, user_id: int, name: str, address: str) -> dict:
    """Update supermarket profile (name and address)."""
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
    """List all stores for supermarket admin."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    u_alias = aliased(User)
    rows = db.query(
        Store.id,
        Store.code,
        Store.name,
        Store.location,
        Store.phone,
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
        Store.id, Store.code, Store.name, Store.location, Store.phone
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
                "staffCount": int(row[5] or 0),
                "code": row[1],
            }
        )

    return {"items": items}


def create_store(db: Session, user_id: int, name: str, address: str = "", code: str = "", phone: str = "") -> dict:
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

    new_store = Store(
        supermarket_id=supermarket_id,
        code=code,
        name=name,
        location=address or None,
        phone=phone or None
    )
    db.add(new_store)
    db.flush()
    store_id = new_store.id
    db.commit()

    return {"success": True, "id": store_id}


def update_store(db: Session, user_id: int, store_id: int, name: str, address: str = "", phone: str = "") -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (name or "").strip()
    address = (address or "").strip()
    phone = (phone or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên store không được để trống.")

    existing = db.query(Store.id).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).update(
        {
            Store.name: name,
            Store.location: address or None,
            Store.phone: phone or None
        },
        synchronize_session=False
    )
    db.commit()
    return {"success": True}


def delete_store(db: Session, user_id: int, store_id: int) -> dict:
    """Delete store if no staff assigned."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    # Check if store has staff
    staff_count = db.query(func.count(User.id)).filter(
        User.store_id == store_id,
        User.role == 'store_staff'
    ).scalar() or 0

    if staff_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa store có {staff_count} nhân viên."
        )

    rowcount = db.query(Store).filter(
        Store.id == store_id,
        Store.supermarket_id == supermarket_id
    ).delete()
    db.commit()

    if (rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    return {"success": True, "message": "Xóa store thành công"}


# ========== Donation Monitoring ==========
def list_donation_monitoring(db: Session, user_id: int, status_filter: str = "all") -> dict:
    """List donation requests for all stores in supermarket."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    query = db.query(
        DonationRequest.id,
        DonationRequest.request_qty,
        DonationRequest.status,
        DonationRequest.received_at,
        DonationRequest.created_at,
        Product.name.label('product_name'),
        InventoryLot.expiry_date,
        Store.name.label('store_name'),
        User.full_name.label('charity_name'),
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).join(
        User, User.id == DonationRequest.charity_id
    ).filter(
        Store.supermarket_id == supermarket_id
    )

    if status_filter != "all":
        query = query.filter(DonationRequest.status == status_filter)

    rows = query.order_by(
        DonationRequest.created_at.desc()
    ).limit(500).all()

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "items": row.product_name,
            "quantity": int(row.request_qty or 0),
            "store": row.store_name or "-",
            "recipient": row.charity_name or "-",
            "status": row.status,
            "date": row.created_at.strftime("%d/%m/%Y %H:%M") if row.created_at else "-",
            "exp": row.expiry_date.strftime("%d/%m/%Y") if row.expiry_date else "-",
        })

    return {"items": items}


# ========== Staff Management ==========
def list_supermarket_staff(db: Session, user_id: int) -> dict:
    """List all staff for supermarket admin."""
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
    """List audit logs for supermarket admin's scope.

    Logs are scoped to:
      - Actions performed by staff in stores belonging to this supermarket
      - Optionally filtered by specific store_id

    Results are sorted newest-first.
    """
    from app.models.audit_log import AuditLog
    from app.models.user import User
    from app.models.store import Store

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
        q = q.filter(AuditLog.action == action.strip())

    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type.strip())

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
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


# ========== Dashboard ==========
def get_dashboard_summary(db: Session, user_id: int, period: str = "daily") -> dict:
    """
    Get dashboard summary for supermarket admin.
    period: 'daily', 'weekly', 'monthly'
    """
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
    total_stores = db.query(func.count(Store.id)).filter(
        Store.supermarket_id == supermarket_id
    ).scalar() or 0

    staff_alias = aliased(User)
    total_staff = db.query(func.count(staff_alias.id)).filter(
        staff_alias.supermarket_id == supermarket_id,
        staff_alias.role.in_(["store_staff", "staff"])
    ).scalar() or 0

    total_products = db.query(func.count(Product.id)).join(
        Store, Store.supermarket_id == supermarket_id
    ).join(
        InventoryLot, InventoryLot.store_id == Store.id
    ).filter(
        Product.id == InventoryLot.product_id
    ).scalar() or 0

    # --- Near expiry (expires in 7 days) ---
    expiry_threshold = now + timedelta(days=7)
    near_expiry = db.query(func.count(InventoryLot.id)).join(
        Store, Store.id == InventoryLot.store_id
    ).filter(
        Store.supermarket_id == supermarket_id,
        InventoryLot.expiry_date <= expiry_threshold,
        InventoryLot.expiry_date >= now,
    ).scalar() or 0

    # --- Orders in period ---
    orders_metric = db.query(
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.sum(Order.total_amount), 0).label("total_revenue"),
        func.coalesce(
            func.sum(func.cast(case((Order.status == "completed", 1), else_=0), Integer)), 0
        ).label("completed_orders"),
    ).join(
        Store, Store.id == Order.store_id
    ).filter(
        Store.supermarket_id == supermarket_id,
        Order.created_at >= current_from,
    ).first()

    total_orders = int(orders_metric.total_orders or 0)
    total_revenue = float(orders_metric.total_revenue or 0)
    completed_orders = int(orders_metric.completed_orders or 0)

    # Previous period
    prev_orders = db.query(func.count(Order.id)).join(
        Store, Store.id == Order.store_id
    ).filter(
        Store.supermarket_id == supermarket_id,
        Order.created_at >= prev_from,
        Order.created_at < prev_to,
    ).scalar() or 0

    prev_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).join(
        Store, Store.id == Order.store_id
    ).filter(
        Store.supermarket_id == supermarket_id,
        Order.created_at >= prev_from,
        Order.created_at < prev_to,
    ).scalar() or 0

    orders_growth = round(((total_orders - int(prev_orders)) / int(prev_orders)) * 100, 1) if prev_orders else 0
    revenue_growth = round(((total_revenue - float(prev_revenue)) / float(prev_revenue)) * 100, 1) if prev_revenue else 0

    # --- Donations in period ---
    donation_metric = db.query(
        func.count(DonationRequest.id).label("donation_count"),
        func.coalesce(func.sum(DonationRequest.request_qty), 0).label("donation_products"),
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).filter(
        Store.supermarket_id == supermarket_id,
        DonationRequest.created_at >= current_from,
    ).first()

    donation_count = int(donation_metric.donation_count or 0)
    donation_products = int(donation_metric.donation_products or 0)

    # Sales vs donation breakdown by store
    store_breakdown = db.query(
        Store.id,
        Store.name,
        func.count(Order.id).label("order_count"),
        func.coalesce(func.sum(Order.total_amount), 0).label("order_revenue"),
        func.count(
            func.distinct(
                case(
                    (func.lower(DonationRequest.status) == "received", DonationRequest.id),
                    else_=None
                )
            )
        ).label("donation_count"),
    ).outerjoin(
        Order, and_(Order.store_id == Store.id, Order.created_at >= current_from)
    ).outerjoin(
        DonationOffer, DonationOffer.store_id == Store.id
    ).outerjoin(
        DonationRequest,
        and_(DonationRequest.offer_id == DonationOffer.id, DonationRequest.created_at >= current_from)
    ).filter(
        Store.supermarket_id == supermarket_id
    ).group_by(Store.id, Store.name).limit(10).all()

    store_stats = []
    for row in store_breakdown:
        store_stats.append({
            "id": row.id,
            "name": row.name,
            "orders": int(row.order_count or 0),
            "revenue": float(row.order_revenue or 0),
            "donations": int(row.donation_count or 0) if row.donation_count else 0,
        })

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
        },
        "growth": {
            "orders": orders_growth,
            "revenue": revenue_growth,
        },
        "storeStats": store_stats,
    }