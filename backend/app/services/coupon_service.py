"""Coupon service layer with business logic."""

from datetime import datetime
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.coupon import Coupon


def list_coupons(db: Session, supermarket_id: int) -> dict:
    """List all coupons for a supermarket."""
    coupons = db.query(
        Coupon.id,
        Coupon.code,
        Coupon.description,
        Coupon.discount_percent,
        Coupon.min_amount,
        Coupon.max_uses,
        Coupon.current_uses,
        Coupon.valid_from,
        Coupon.valid_to,
        Coupon.is_active,
        Coupon.created_at,
        Coupon.updated_at,
    ).filter(
        Coupon.supermarket_id == supermarket_id
    ).order_by(
        Coupon.valid_to.desc()
    ).all()

    return {
        "items": [
            {
                "id": row[0],
                "code": row[1],
                "description": row[2],
                "discountPercent": float(row[3]),
                "minAmount": float(row[4]) if row[4] else None,
                "maxUses": row[5],
                "currentUses": row[6],
                "validFrom": row[7],
                "validTo": row[8],
                "isActive": row[9],
                "createdAt": row[10],
                "updatedAt": row[11],
            }
            for row in coupons
        ]
    }


def create_coupon(
    db: Session,
    supermarket_id: int,
    code: str,
    description: str | None,
    discount_percent: float,
    min_amount: float | None,
    max_uses: int | None,
    valid_from: str,
    valid_to: str,
) -> dict:
    """Create a new coupon."""
    # Validate discount
    if discount_percent is None or discount_percent < 0 or discount_percent > 100:
        return {"error": "Phần trăm giảm giá phải từ 0 đến 100"}

    # Check if code already exists
    existing = db.query(Coupon).filter(Coupon.code == code).first()
    if existing:
        return {"error": f"Mã coupon '{code}' đã tồn tại"}

    # Parse dates
    try:
        valid_from_dt = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
        valid_to_dt = datetime.fromisoformat(valid_to.replace('Z', '+00:00'))
    except ValueError:
        return {"error": "Định dạng ngày không hợp lệ. Sử dụng ISO format: 2026-04-01T00:00:00"}

    # Validate dates
    if valid_from_dt >= valid_to_dt:
        return {"error": "Ngày bắt đầu phải nhỏ hơn ngày kết thúc"}

    new_coupon = Coupon(
        supermarket_id=supermarket_id,
        code=code.upper(),
        description=description,
        discount_percent=float(discount_percent),
        min_amount=float(min_amount) if min_amount else None,
        max_uses=max_uses,
        current_uses=0,
        valid_from=valid_from_dt,
        valid_to=valid_to_dt,
        is_active=True,
    )
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)

    return {
        "success": True,
        "message": f"Tạo coupon '{code}' thành công",
        "id": new_coupon.id,
    }


def update_coupon(
    db: Session,
    coupon_id: int,
    supermarket_id: int,
    code: str | None = None,
    description: str | None = None,
    discount_percent: float | None = None,
    min_amount: float | None = None,
    max_uses: int | None = None,
    valid_from: str | None = None,
    valid_to: str | None = None,
    is_active: bool | None = None,
) -> dict:
    """Update a coupon."""
    coupon = db.query(Coupon).filter(
        and_(
            Coupon.id == coupon_id,
            Coupon.supermarket_id == supermarket_id,
        )
    ).first()

    if not coupon:
        return {"error": "Coupon không tồn tại"}

    # Validate discount if updating
    if discount_percent is not None and (discount_percent < 0 or discount_percent > 100):
        return {"error": "Phần trăm giảm giá phải từ 0 đến 100"}

    # Check code uniqueness if updating
    if code and code.upper() != coupon.code:
        existing = db.query(Coupon).filter(Coupon.code == code.upper()).first()
        if existing:
            return {"error": f"Mã coupon '{code}' đã tồn tại"}
        coupon.code = code.upper()

    if description is not None:
        coupon.description = description
    if discount_percent is not None:
        coupon.discount_percent = float(discount_percent)
    if min_amount is not None:
        coupon.min_amount = float(min_amount)
    if max_uses is not None:
        coupon.max_uses = max_uses
    if is_active is not None:
        coupon.is_active = is_active

    # Update dates if provided
    if valid_from or valid_to:
        try:
            if valid_from:
                coupon.valid_from = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
            if valid_to:
                coupon.valid_to = datetime.fromisoformat(valid_to.replace('Z', '+00:00'))

            # Validate dates
            if coupon.valid_from >= coupon.valid_to:
                return {"error": "Ngày bắt đầu phải nhỏ hơn ngày kết thúc"}
        except ValueError:
            return {"error": "Định dạng ngày không hợp lệ"}

    coupon.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": f"Cập nhật coupon thành công"}


def delete_coupon(db: Session, coupon_id: int, supermarket_id: int) -> dict:
    """Delete a coupon."""
    result = db.query(Coupon).filter(
        and_(
            Coupon.id == coupon_id,
            Coupon.supermarket_id == supermarket_id,
        )
    ).delete()

    if result == 0:
        return {"error": "Coupon không tồn tại"}

    db.commit()
    return {"success": True, "message": "Xóa coupon thành công"}


def toggle_coupon(db: Session, coupon_id: int, supermarket_id: int) -> dict:
    """Toggle coupon active status."""
    coupon = db.query(Coupon).filter(
        and_(
            Coupon.id == coupon_id,
            Coupon.supermarket_id == supermarket_id,
        )
    ).first()

    if not coupon:
        return {"error": "Coupon không tồn tại"}

    coupon.is_active = not coupon.is_active
    coupon.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": f"Coupon đã được {'bật' if coupon.is_active else 'tắt'}",
    }
