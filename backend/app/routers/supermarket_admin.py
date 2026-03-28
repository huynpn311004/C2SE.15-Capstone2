import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/supermarket-admin", tags=["supermarket-admin"])


def _dict_row(row) -> dict:
    return dict(row._mapping)


def _get_supermarket_scope(db: Session, user_id: int) -> int:
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
    base = re.sub(r"[^a-z0-9]+", "", name.strip().lower())
    if not base:
        base = "store"
    return f"st_{base[:18]}"


def _generate_unique_store_code(db: Session, supermarket_id: int, name: str) -> str:
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


@router.get("/stores")
def list_stores(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id = _get_supermarket_scope(db, user_id)

    rows = db.execute(
        text(
            """
            SELECT
                st.id,
                st.code,
                st.name,
                st.location,
                COUNT(u.id) AS staff_count
            FROM stores st
            LEFT JOIN users u
              ON u.store_id = st.id
             AND u.role = 'store_staff'
            WHERE st.supermarket_id = :supermarket_id
            GROUP BY st.id, st.code, st.name, st.location
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
                "phone": "",
                "status": "active",
                "staffCount": int(item["staff_count"] or 0),
                "code": item["code"],
            }
        )

    return {"items": items}


@router.post("/stores")
def create_store(
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (payload.get("name") or "").strip()
    address = (payload.get("address") or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên store không được để trống.")

    code = (payload.get("code") or "").strip().lower()
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
            INSERT INTO stores (supermarket_id, code, name, location)
            VALUES (:supermarket_id, :code, :name, :location)
            """
        ),
        {
            "supermarket_id": supermarket_id,
            "code": code,
            "name": name,
            "location": address or None,
        },
    )
    db.commit()

    return {"success": True, "id": result.lastrowid}


@router.put("/stores/{store_id}")
def update_store(
    store_id: int,
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id = _get_supermarket_scope(db, user_id)
    name = (payload.get("name") or "").strip()
    address = (payload.get("address") or "").strip()

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
                location = :location
            WHERE id = :store_id
              AND supermarket_id = :supermarket_id
            """
        ),
        {
            "name": name,
            "location": address or None,
            "store_id": store_id,
            "supermarket_id": supermarket_id,
        },
    )
    db.commit()
    return {"success": True}


@router.delete("/stores/{store_id}")
def delete_store(
    store_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    supermarket_id = _get_supermarket_scope(db, user_id)

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
            UPDATE users
            SET store_id = NULL
            WHERE store_id = :store_id
            """
        ),
        {"store_id": store_id},
    )

    db.execute(
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
    return {"success": True}