"""Supermarket admin service layer with business logic."""

import re
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    """Convert SQLAlchemy row to dictionary."""
    return dict(row._mapping)


def _get_supermarket_scope(db: Session, user_id: int) -> int:
    """Get supermarket_id for supermarket admin."""
    user = db.execute(
        text(
            """
            SELECT id, role, supermarket_id
            FROM users
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": user_id},
    ).first()

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
        exists = db.execute(
            text(
                """
                SELECT id
                FROM stores
                WHERE supermarket_id = :supermarket_id
                  AND code = :code
                LIMIT 1
                """
            ),
            {"supermarket_id": supermarket_id, "code": candidate},
        ).first()

        if not exists:
            return candidate

        index += 1
        candidate = f"{_build_store_code(name)}_{index}"


# ========== Store Management ==========
def list_stores(db: Session, user_id: int) -> dict:
    """List all stores for supermarket admin."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    rows = db.execute(
        text(
            """
            SELECT
                st.id,
                st.code,
                st.name,
                st.location,
                st.phone,
                COUNT(u.id) AS staff_count
            FROM stores st
            LEFT JOIN users u
              ON u.store_id = st.id
             AND u.role = 'store_staff'
            WHERE st.supermarket_id = :supermarket_id
            GROUP BY st.id, st.code, st.name, st.location, st.phone
            ORDER BY st.id DESC
            """
        ),
        {"supermarket_id": supermarket_id},
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        items.append(
            {
                "id": item["id"],
                "name": item["name"],
                "address": item["location"] or "",
                "phone": item["phone"] or "",
                "status": "active",
                "staffCount": int(item["staff_count"] or 0),
                "code": item["code"],
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

    existing = db.execute(
        text(
            """
            SELECT id
            FROM stores
            WHERE supermarket_id = :supermarket_id
              AND code = :code
            LIMIT 1
            """
        ),
        {"supermarket_id": supermarket_id, "code": code},
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã store đã tồn tại.")

    result = db.execute(
        text(
            """
            INSERT INTO stores (supermarket_id, code, name, location, phone)
            VALUES (:supermarket_id, :code, :name, :location, :phone)
            """
        ),
        {
            "supermarket_id": supermarket_id,
            "code": code,
            "name": name,
            "location": address or None,
            "phone": phone or None,
        },
    )
    db.commit()

    return {"success": True, "id": result.lastrowid}


def update_store(db: Session, user_id: int, store_id: int, name: str, address: str = "", phone: str = "") -> dict:
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (name or "").strip()
    address = (address or "").strip()
    phone = (phone or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên store không được để trống.")

    existing = db.execute(
        text(
            """
            SELECT id
            FROM stores
            WHERE id = :store_id
              AND supermarket_id = :supermarket_id
            LIMIT 1
            """
        ),
        {"store_id": store_id, "supermarket_id": supermarket_id},
    ).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    db.execute(
        text(
            """
            UPDATE stores
            SET name = :name,
                location = :location,
                phone = :phone
            WHERE id = :store_id
              AND supermarket_id = :supermarket_id
            """
        ),
        {
            "name": name,
            "location": address or None,
            "phone": phone or None,
            "store_id": store_id,
            "supermarket_id": supermarket_id,
        },
    )
    db.commit()
    return {"success": True}


def delete_store(db: Session, user_id: int, store_id: int) -> dict:
    """Delete store if no staff assigned."""
    supermarket_id = _get_supermarket_scope(db, user_id)

    # Check if store has staff
    staff_count = db.execute(
        text("SELECT COUNT(*) FROM users WHERE store_id = :store_id AND role = 'store_staff'"),
        {"store_id": store_id},
    ).scalar() or 0

    if staff_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa store có {staff_count} nhân viên."
        )

    result = db.execute(
        text(
            """
            DELETE FROM stores
            WHERE id = :store_id
              AND supermarket_id = :supermarket_id
            """
        ),
        {"store_id": store_id, "supermarket_id": supermarket_id},
    )
    db.commit()

    if (result.rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store không tồn tại.")

    return {"success": True, "message": "Xóa store thành công"}
