from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/discount-policy", tags=["discount-policy"])


def _check_supermarket_admin(db: Session, user_id: int) -> int:
    """Kiem tra user co phai la Supermarket Admin, tra ve supermarket_id."""
    user = db.execute(
        text(
            """
            SELECT id, role, supermarket_id
            FROM users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = (user.role or "").lower()
    if role != "supermarket_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chi co Quan Ly Siêu Thị moi co quyen chinh sua chinh sach giam gia.",
        )

    if not user.supermarket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tai khoan chua duoc gan siêu thị.",
        )

    return int(user.supermarket_id)


@router.get("")
def list_discount_policies(
    user_id: int = Query(default=None),
    supermarket_id: int = Query(default=None),
    db: Session = Depends(get_db),
):
    if user_id:
        scope = db.execute(
            text("SELECT role, supermarket_id FROM users WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).first()
        if scope:
            if scope.role == "supermarket_admin":
                supermarket_id = scope.supermarket_id
            elif scope.role == "system_admin":
                pass  # System admin thay tat ca, supermarket_id=None
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tai khoan khong co quyen xem chinh sach giam gia.",
                )

    query = """
        SELECT id, supermarket_id, name, min_days_left, max_days_left,
               discount_percent, is_active
        FROM discount_policies
        WHERE 1=1
    """
    params = {}

    if supermarket_id:
        query += " AND supermarket_id = :supermarket_id"
        params["supermarket_id"] = supermarket_id

    query += " ORDER BY discount_percent DESC, min_days_left ASC"

    rows = db.execute(text(query), params).all()

    items = [
        {
            "id": row.id,
            "supermarketId": row.supermarket_id,
            "name": row.name,
            "minDaysLeft": row.min_days_left,
            "maxDaysLeft": row.max_days_left,
            "discountPercent": float(row.discount_percent),
            "isActive": bool(row.is_active),
        }
        for row in rows
    ]

    return {"items": items}


@router.get("/{policy_id}")
def get_discount_policy(
    policy_id: int,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text(
            """
            SELECT id, supermarket_id, name, min_days_left, max_days_left,
                   discount_percent, is_active
            FROM discount_policies
            WHERE id = :policy_id
            LIMIT 1
            """
        ),
        {"policy_id": policy_id},
    ).first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {
        "id": row.id,
        "supermarketId": row.supermarket_id,
        "name": row.name,
        "minDaysLeft": row.min_days_left,
        "maxDaysLeft": row.max_days_left,
        "discountPercent": float(row.discount_percent),
        "isActive": bool(row.is_active),
    }


@router.post("")
def create_discount_policy(
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id_scope = _check_supermarket_admin(db, user_id)

    name = (payload.get("name") or "").strip()
    min_days = payload.get("minDaysLeft")
    max_days = payload.get("maxDaysLeft")
    discount = payload.get("discountPercent")
    supermarket_id = payload.get("supermarketId")
    is_active = payload.get("isActive", True)

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ten chinh sach khong duoc trong")
    if min_days is None or min_days < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay toi thieu khong hop le")
    if max_days is None or max_days < min_days:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay toi da phai lon hon ngay toi thieu")
    if discount is None or discount < 0 or discount > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phan tram giam gia khong hop le (0-100)")

    if supermarket_id_scope is not None:
        supermarket_id = supermarket_id_scope
    elif supermarket_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phai chon siêu thị.",
        )

    db.execute(
        text(
            """
            INSERT INTO discount_policies
                (supermarket_id, name, min_days_left, max_days_left, discount_percent, is_active)
            VALUES
                (:supermarket_id, :name, :min_days, :max_days, :discount, :is_active)
            """
        ),
        {
            "supermarket_id": supermarket_id,
            "name": name,
            "min_days": min_days,
            "max_days": max_days,
            "discount": float(discount),
            "is_active": is_active,
        },
    )
    db.commit()

    return {"success": True, "message": "Tao chinh sach thanh cong"}


@router.put("/{policy_id}")
def update_discount_policy(
    policy_id: int,
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id_scope = _check_supermarket_admin(db, user_id)
    name = (payload.get("name") or "").strip()
    min_days = payload.get("minDaysLeft")
    max_days = payload.get("maxDaysLeft")
    discount = payload.get("discountPercent")
    is_active = payload.get("isActive")

    if name is not None and not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ten chinh sach khong duoc trong")
    if min_days is not None and min_days < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay toi thieu khong hop le")
    if max_days is not None and min_days is not None and max_days < min_days:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay toi da phai lon hon ngay toi thieu")
    if discount is not None and (discount < 0 or discount > 100):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phan tram giam gia khong hop le (0-100)")

    policy = db.execute(
        text("SELECT id FROM discount_policies WHERE id = :policy_id LIMIT 1"),
        {"policy_id": policy_id},
    ).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    updates = []
    params = {"policy_id": policy_id}

    if name is not None:
        updates.append("name = :name")
        params["name"] = name
    if min_days is not None:
        updates.append("min_days_left = :min_days")
        params["min_days"] = min_days
    if max_days is not None:
        updates.append("max_days_left = :max_days")
        params["max_days"] = max_days
    if discount is not None:
        updates.append("discount_percent = :discount")
        params["discount"] = float(discount)
    if is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = is_active

    if updates:
        query = f"UPDATE discount_policies SET {', '.join(updates)} WHERE id = :policy_id"
        db.execute(text(query), params)
        db.commit()

    return {"success": True, "message": "Cap nhat chinh sach thanh cong"}


@router.delete("/{policy_id}")
def delete_discount_policy(
    policy_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    _check_supermarket_admin(db, user_id)
    result = db.execute(
        text("DELETE FROM discount_policies WHERE id = :policy_id"),
        {"policy_id": policy_id},
    )
    db.commit()

    if (result.rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {"success": True, "message": "Xoa chinh sach thanh cong"}


@router.patch("/{policy_id}/toggle")
def toggle_discount_policy(
    policy_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    _check_supermarket_admin(db, user_id)
    result = db.execute(
        text(
            """
            UPDATE discount_policies
            SET is_active = NOT is_active
            WHERE id = :policy_id
            """
        ),
        {"policy_id": policy_id},
    )
    db.commit()

    if (result.rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {"success": True, "message": "Cap nhat trang thai thanh cong"}


@router.get("/calculate")
def calculate_discount(
    base_price: float = Query(..., ge=0),
    expiry_date: str = Query(...),
    supermarket_id: int = Query(default=None),
    db: Session = Depends(get_db),
):
    from datetime import date, datetime, timedelta

    try:
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay het han khong dung dinh dang (YYYY-MM-DD)")

    days_left = (expiry - date.today()).days

    if days_left < 0:
        return {
            "daysLeft": days_left,
            "basePrice": base_price,
            "salePrice": base_price,
            "discountPercent": 0,
            "status": "Da het han",
        }

    policies = db.execute(
        text(
            """
            SELECT discount_percent, min_days_left, max_days_left, name
            FROM discount_policies
            WHERE is_active = 1
              AND (:supermarket_id IS NULL OR supermarket_id = :supermarket_id)
              AND min_days_left <= :days_left
              AND max_days_left >= :days_left
            ORDER BY discount_percent DESC
            LIMIT 1
            """
        ),
        {"days_left": days_left, "supermarket_id": supermarket_id},
    ).first()

    if policies:
        discount_percent = float(policies.discount_percent)
        sale_price = round(base_price * (1 - discount_percent / 100), 0)
        return {
            "daysLeft": days_left,
            "basePrice": base_price,
            "salePrice": sale_price,
            "discountPercent": discount_percent,
            "policyName": policies.name,
            "status": "Con han",
        }

    return {
        "daysLeft": days_left,
        "basePrice": base_price,
        "salePrice": base_price,
        "discountPercent": 0,
        "status": "Khong ap dung khuyen mai",
    }
