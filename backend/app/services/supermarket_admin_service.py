"""Supermarket admin service layer with business logic."""

import re
from sqlalchemy import func, and_
from sqlalchemy.orm import Session, aliased
from fastapi import HTTPException, status

from app.models.user import User
from app.models.store import Store
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


def update_donation_request_status(db: Session, user_id: int, request_id: int, new_status: str) -> dict:
    """Update donation request status for supermarket admin."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    valid_statuses = ['pending', 'approved', 'rejected']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(valid_statuses)}"
        )

    # Verify that the request belongs to a store in this supermarket
    request = db.query(DonationRequest).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).filter(
        DonationRequest.id == request_id,
        Store.supermarket_id == supermarket_id
    ).first()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation request không tồn tại hoặc không thuộc supermarket của bạn"
        )

    request.status = new_status
    db.commit()

    return {"success": True, "message": f"Cập nhật trạng thái thành {new_status} thành công"}