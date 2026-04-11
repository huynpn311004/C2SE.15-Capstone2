"""Discount policy service layer with business logic."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status


# ========== Helper Functions ==========
def _check_supermarket_admin(db: Session, user_id: int) -> int:
    """Check if user is supermarket admin and return supermarket_id."""
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


def _validate_category_id(db: Session, category_id: int | None) -> None:
    """Validate category exists if provided."""
    if category_id is None:
        return
    
    exists = db.execute(
        text("SELECT id FROM categories WHERE id = :category_id LIMIT 1"),
        {"category_id": category_id},
    ).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh muc khong ton tai")


def _validate_product_id(db: Session, product_id: int | None) -> None:
    """Validate product exists if provided."""
    if product_id is None:
        return
    
    exists = db.execute(
        text("SELECT id FROM products WHERE id = :product_id LIMIT 1"),
        {"product_id": product_id},
    ).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="San pham khong ton tai")


# ========== Discount Policies CRUD ==========
def list_discount_policies(db: Session, user_id: int | None = None, supermarket_id: int | None = None) -> dict:
    """List discount policies with optional filters."""
    if user_id:
        scope = db.execute(
            text("SELECT role, supermarket_id FROM users WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).first()
        if scope:
            if scope.role == "supermarket_admin":
                supermarket_id = scope.supermarket_id
            elif scope.role == "system_admin":
                pass  # System admin sees all
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tai khoan khong co quyen xem chinh sach giam gia.",
                )

    query = """
        SELECT dp.id, dp.supermarket_id, dp.name, dp.min_days_left, dp.max_days_left,
               dp.discount_percent, dp.is_active, dp.category_id, dp.product_id,
               c.name AS category_name, p.name AS product_name
        FROM discount_policies dp
        LEFT JOIN categories c ON c.id = dp.category_id
        LEFT JOIN products p ON p.id = dp.product_id
        WHERE 1=1
    """
    params = {}

    if supermarket_id:
        query += " AND dp.supermarket_id = :supermarket_id"
        params["supermarket_id"] = supermarket_id

    query += " ORDER BY dp.discount_percent DESC, dp.min_days_left ASC"

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
            "categoryId": row.category_id,
            "categoryName": row.category_name,
            "productId": row.product_id,
            "productName": row.product_name,
            "appliesTo": row.product_name or row.category_name or "Tat ca san pham",
        }
        for row in rows
    ]

    return {"items": items}


def get_discount_policy(db: Session, policy_id: int) -> dict:
    """Get discount policy details."""
    row = db.execute(
        text(
            """
            SELECT dp.id, dp.supermarket_id, dp.name, dp.min_days_left, dp.max_days_left,
                   dp.discount_percent, dp.is_active, dp.category_id, dp.product_id,
                   c.name AS category_name, p.name AS product_name
            FROM discount_policies dp
            LEFT JOIN categories c ON c.id = dp.category_id
            LEFT JOIN products p ON p.id = dp.product_id
            WHERE dp.id = :policy_id
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
        "categoryId": row.category_id,
        "categoryName": row.category_name,
        "productId": row.product_id,
        "productName": row.product_name,
        "appliesTo": row.product_name or row.category_name or "Tat ca san pham",
    }


def create_discount_policy(
    db: Session,
    user_id: int,
    name: str,
    min_days: int,
    max_days: int,
    discount: float,
    supermarket_id: int | None = None,
    category_id: int | None = None,
    product_id: int | None = None,
    is_active: bool = True,
) -> dict:
    """Create new discount policy with optional category or product scope."""
    supermarket_id_scope = _check_supermarket_admin(db, user_id)

    name = (name or "").strip()

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

    # Validate that only one of category_id or product_id is set
    if category_id is not None and product_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi set Danh muc hoac San pham, khong phai ca hai",
        )

    # Validate category and product if provided
    if category_id is not None:
        _validate_category_id(db, category_id)
    if product_id is not None:
        _validate_product_id(db, product_id)

    db.execute(
        text(
            """
            INSERT INTO discount_policies
                (supermarket_id, category_id, product_id, name, min_days_left, max_days_left, discount_percent, is_active)
            VALUES
                (:supermarket_id, :category_id, :product_id, :name, :min_days, :max_days, :discount, :is_active)
            """
        ),
        {
            "supermarket_id": supermarket_id,
            "category_id": category_id,
            "product_id": product_id,
            "name": name,
            "min_days": min_days,
            "max_days": max_days,
            "discount": float(discount),
            "is_active": is_active,
        },
    )
    db.commit()

    return {"success": True, "message": "Tao chinh sach thanh cong"}


def update_discount_policy(
    db: Session,
    policy_id: int,
    user_id: int,
    name: str | None = None,
    min_days: int | None = None,
    max_days: int | None = None,
    discount: float | None = None,
    category_id: int | None = None,
    product_id: int | None = None,
    is_active: bool | None = None,
) -> dict:
    """Update discount policy."""
    _check_supermarket_admin(db, user_id)

    if name is not None:
        name = (name or "").strip()
        if not name:
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

    # Validate that only one of category_id or product_id is set
    if category_id is not None and product_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi set Danh muc hoac San pham, khong phai ca hai",
        )

    # Validate category and product if provided
    if category_id is not None:
        _validate_category_id(db, category_id)
    if product_id is not None:
        _validate_product_id(db, product_id)

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
    if category_id is not None or (category_id is None and "category_id" in locals()):
        updates.append("category_id = :category_id")
        params["category_id"] = category_id
    if product_id is not None or (product_id is None and "product_id" in locals()):
        updates.append("product_id = :product_id")
        params["product_id"] = product_id
    if is_active is not None:
        updates.append("is_active = :is_active")
        params["is_active"] = is_active

    if updates:
        query = f"UPDATE discount_policies SET {', '.join(updates)} WHERE id = :policy_id"
        db.execute(text(query), params)
        db.commit()

    return {"success": True, "message": "Cap nhat chinh sach thanh cong"}


def delete_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    """Delete discount policy."""
    _check_supermarket_admin(db, user_id)
    result = db.execute(
        text("DELETE FROM discount_policies WHERE id = :policy_id"),
        {"policy_id": policy_id},
    )
    db.commit()

    if (result.rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {"success": True, "message": "Xoa chinh sach thanh cong"}


def toggle_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    """Toggle discount policy active status."""
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


# ========== Discount Calculation with 3-Level Priority ==========
def calculate_discount(
    db: Session,
    base_price: float,
    expiry_date: str,
    supermarket_id: int | None = None,
    product_id: int | None = None,
) -> dict:
    """
    Calculate discount for a product based on expiry date.
    
    Priority order:
    1. Product-specific policy (highest priority)
    2. Category policy (medium priority)
    3. Supermarket default policy (lowest priority)
    4. No policy (0% discount)
    """
    try:
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay het han khong hop le")

    days_left = (expiry - date.today()).days
    discount_percent = 0.0

    # LEVEL 1: Check for PRODUCT-SPECIFIC policy
    if product_id:
        policy = db.execute(
            text(
                """
                SELECT discount_percent
                FROM discount_policies
                WHERE product_id = :product_id
                  AND is_active = 1
                  AND min_days_left <= :days_left
                  AND max_days_left >= :days_left
                ORDER BY discount_percent DESC
                LIMIT 1
                """
            ),
            {"product_id": product_id, "days_left": days_left},
        ).first()

        if policy:
            discount_percent = float(policy.discount_percent)
            discount_amount = base_price * (discount_percent / 100.0)
            final_price = base_price - discount_amount
            return {
                "discountPercent": discount_percent,
                "originalPrice": float(base_price),
                "discountAmount": discount_amount,
                "finalPrice": float(final_price),
                "appliedLevel": "product",
            }

    # LEVEL 2: Check for CATEGORY policy
    if product_id:
        category = db.execute(
            text("SELECT category_id FROM products WHERE id = :product_id LIMIT 1"),
            {"product_id": product_id},
        ).first()

        if category and category.category_id:
            policy = db.execute(
                text(
                    """
                    SELECT discount_percent
                    FROM discount_policies
                    WHERE category_id = :category_id
                      AND is_active = 1
                      AND min_days_left <= :days_left
                      AND max_days_left >= :days_left
                    ORDER BY discount_percent DESC
                    LIMIT 1
                    """
                ),
                {"category_id": category.category_id, "days_left": days_left},
            ).first()

            if policy:
                discount_percent = float(policy.discount_percent)
                discount_amount = base_price * (discount_percent / 100.0)
                final_price = base_price - discount_amount
                return {
                    "discountPercent": discount_percent,
                    "originalPrice": float(base_price),
                    "discountAmount": discount_amount,
                    "finalPrice": float(final_price),
                    "appliedLevel": "category",
                }

    # LEVEL 3: Check for SUPERMARKET DEFAULT policy
    if supermarket_id:
        policy = db.execute(
            text(
                """
                SELECT discount_percent
                FROM discount_policies
                WHERE supermarket_id = :supermarket_id
                  AND category_id IS NULL
                  AND product_id IS NULL
                  AND is_active = 1
                  AND min_days_left <= :days_left
                  AND max_days_left >= :days_left
                ORDER BY discount_percent DESC
                LIMIT 1
                """
            ),
            {"supermarket_id": supermarket_id, "days_left": days_left},
        ).first()

        if policy:
            discount_percent = float(policy.discount_percent)
            discount_amount = base_price * (discount_percent / 100.0)
            final_price = base_price - discount_amount
            return {
                "discountPercent": discount_percent,
                "originalPrice": float(base_price),
                "discountAmount": discount_amount,
                "finalPrice": float(final_price),
                "appliedLevel": "supermarket_default",
            }

    # NO POLICY FOUND
    return {
        "discountPercent": 0.0,
        "originalPrice": float(base_price),
        "discountAmount": 0.0,
        "finalPrice": float(base_price),
        "appliedLevel": "none",
    }

