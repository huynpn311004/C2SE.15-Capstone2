"""Discount policy service layer with business logic."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import update, func, text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.discount_policy import DiscountPolicy
from app.models.user import User
from app.models.product import Product
from app.models.category import Category


# ========== Helper Functions ==========
def _check_supermarket_admin(db: Session, user_id: int) -> int:
    """Check if user is supermarket admin and return supermarket_id."""
    user = db.query(User).filter(User.id == user_id).first()

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
    
    exists = db.query(Category).filter(Category.id == category_id).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh muc khong ton tai")


def _validate_product_id(db: Session, product_id: int | None) -> None:
    """Validate product exists if provided."""
    if product_id is None:
        return
    
    exists = db.query(Product.id).filter(Product.id == product_id).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="San pham khong ton tai")


def _check_policy_overlap(
    db: Session,
    supermarket_id: int,
    min_days: int,
    max_days: int,
    category_id: int | None = None,
    product_id: int | None = None,
    exclude_policy_id: int | None = None,
) -> dict:
    """
    Check for overlapping discount policies.
    
    Overlap occurs when:
    1. Same supermarket
    2. Same scope (product_id, category_id, or both None)
    3. Days range overlaps: min_days <= other_max_days AND max_days >= other_min_days
    
    Returns dict with overlapping policies if found, empty dict if none.
    """
    query = db.query(
        DiscountPolicy.id,
        DiscountPolicy.name,
        DiscountPolicy.min_days_left,
        DiscountPolicy.max_days_left,
        DiscountPolicy.discount_percent,
        DiscountPolicy.is_active,
    ).filter(
        DiscountPolicy.supermarket_id == supermarket_id,
        # Check days overlap: new_min <= existing_max AND new_max >= existing_min
        DiscountPolicy.min_days_left <= max_days,
        DiscountPolicy.max_days_left >= min_days,
    )
    
    # Match same scope (product_id, category_id)
    if product_id is not None:
        query = query.filter(DiscountPolicy.product_id == product_id)
    elif category_id is not None:
        query = query.filter(DiscountPolicy.category_id == category_id)
    else:
        # Both None - match default policies (no product, no category)
        query = query.filter(
            DiscountPolicy.product_id.is_(None),
            DiscountPolicy.category_id.is_(None),
        )
    
    # Exclude current policy if updating
    if exclude_policy_id is not None:
        query = query.filter(DiscountPolicy.id != exclude_policy_id)
    
    overlapping = query.all()
    
    if not overlapping:
        return {}
    
    # Return overlapping policies info
    return {
        "hasOverlap": True,
        "count": len(overlapping),
        "overlappingPolicies": [
            {
                "id": row[0],
                "name": row[1],
                "minDaysLeft": row[2],
                "maxDaysLeft": row[3],
                "discountPercent": float(row[4]),
                "isActive": bool(row[5]),
                "message": f"Policy '{row[1]}': Days {row[2]}-{row[3]}, {row[4]}% discount"
            }
            for row in overlapping
        ]
    }


# ========== Discount Policies CRUD ==========
def list_discount_policies(db: Session, user_id: int | None = None, supermarket_id: int | None = None) -> dict:
    """List discount policies with optional filters."""
    if user_id:
        scope = db.query(User.role, User.supermarket_id).filter(User.id == user_id).first()
        if scope:
            if scope.role == "supermarket_admin":
                supermarket_id = scope.supermarket_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tai khoan khong co quyen xem chinh sach giam gia.",
                )

    query = db.query(
        DiscountPolicy.id,
        DiscountPolicy.supermarket_id,
        DiscountPolicy.name,
        DiscountPolicy.min_days_left,
        DiscountPolicy.max_days_left,
        DiscountPolicy.discount_percent,
        DiscountPolicy.is_active,
        DiscountPolicy.category_id,
        DiscountPolicy.product_id,
        Category.name.label('category_name'),
        Product.name.label('product_name')
    ).outerjoin(
        Category, Category.id == DiscountPolicy.category_id
    ).outerjoin(
        Product, Product.id == DiscountPolicy.product_id
    )

    if supermarket_id:
        query = query.filter(DiscountPolicy.supermarket_id == supermarket_id)

    query = query.order_by(
        DiscountPolicy.discount_percent.desc(),
        DiscountPolicy.min_days_left.asc()
    )

    rows = query.all()

    items = [
        {
            "id": row[0],
            "supermarketId": row[1],
            "name": row[2],
            "minDaysLeft": row[3],
            "maxDaysLeft": row[4],
            "discountPercent": float(row[5]),
            "isActive": bool(row[6]),
            "categoryId": row[7],
            "categoryName": row[9],
            "productId": row[8],
            "productName": row[10],
            "appliesTo": row[10] or row[9] or "Tat ca san pham",
        }
        for row in rows
    ]

    return {"items": items}


def get_discount_policy(db: Session, policy_id: int) -> dict:
    """Get discount policy details."""
    row = db.query(
        DiscountPolicy.id,
        DiscountPolicy.supermarket_id,
        DiscountPolicy.name,
        DiscountPolicy.min_days_left,
        DiscountPolicy.max_days_left,
        DiscountPolicy.discount_percent,
        DiscountPolicy.is_active,
        DiscountPolicy.category_id,
        DiscountPolicy.product_id,
        Category.name.label('category_name'),
        Product.name.label('product_name')
    ).outerjoin(
        Category, Category.id == DiscountPolicy.category_id
    ).outerjoin(
        Product, Product.id == DiscountPolicy.product_id
    ).filter(DiscountPolicy.id == policy_id).first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {
        "id": row[0],
        "supermarketId": row[1],
        "name": row[2],
        "minDaysLeft": row[3],
        "maxDaysLeft": row[4],
        "discountPercent": float(row[5]),
        "isActive": bool(row[6]),
        "categoryId": row[7],
        "categoryName": row[9],
        "productId": row[8],
        "productName": row[10],
        "appliesTo": row[10] or row[9] or "Tat ca san pham",
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

    # Note: overlapping policies are allowed; calculate_discount will use
    # the highest discount_percent among all active overlapping policies.

    new_policy = DiscountPolicy(
        supermarket_id=supermarket_id,
        category_id=category_id,
        product_id=product_id,
        name=name,
        min_days_left=min_days,
        max_days_left=max_days,
        discount_percent=float(discount),
        is_active=is_active,
    )
    db.add(new_policy)
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

    # Check if policy exists using ORM
    policy = db.query(DiscountPolicy).filter(DiscountPolicy.id == policy_id).first()
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

    # CHECK FOR OVERLAPPING POLICIES when updating scope or days (Option A: Strict)
    # Only check if we're changing min_days, max_days, product_id, or category_id
    if min_days is not None or max_days is not None or category_id is not None or product_id is not None:
        # Use current values if not being updated
        check_min_days = min_days if min_days is not None else policy.min_days_left
        check_max_days = max_days if max_days is not None else policy.max_days_left
        check_category_id = category_id if category_id is not None else policy.category_id
        check_product_id = product_id if product_id is not None else policy.product_id
        
        overlap_result = _check_policy_overlap(
            db,
            supermarket_id=policy.supermarket_id,
            min_days=check_min_days,
            max_days=check_max_days,
            category_id=check_category_id,
            product_id=check_product_id,
            exclude_policy_id=policy_id,  # Don't check against itself
        )
        
        if overlap_result.get("hasOverlap"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Chinh sach xung dot voi {overlap_result['count']} chinh sach hien tai. "
                       f"Vui long sua lai cac chinh sach cu trc: "
                       f"{'; '.join(p['message'] for p in overlap_result['overlappingPolicies'])}"
            )

    # Build update values dictionary - no SQL concatenation
    update_values = {}
    
    if name is not None:
        update_values["name"] = name
    if min_days is not None:
        update_values["min_days_left"] = min_days
    if max_days is not None:
        update_values["max_days_left"] = max_days
    if discount is not None:
        update_values["discount_percent"] = float(discount)
    if category_id is not None or (category_id is None and "category_id" in locals()):
        update_values["category_id"] = category_id
    if product_id is not None or (product_id is None and "product_id" in locals()):
        update_values["product_id"] = product_id
    if is_active is not None:
        update_values["is_active"] = is_active

    if update_values:
        # Use SQLAlchemy update() method - completely parameterized, no SQL string building
        db.execute(
            update(DiscountPolicy)
            .where(DiscountPolicy.id == policy_id)
            .values(**update_values)
        )
        db.commit()

    return {"success": True, "message": "Cap nhat chinh sach thanh cong"}


def delete_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    """Delete discount policy."""
    _check_supermarket_admin(db, user_id)
    result = db.query(DiscountPolicy).filter(
        DiscountPolicy.id == policy_id
    ).delete()
    db.commit()

    if result == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")

    return {"success": True, "message": "Xoa chinh sach thanh cong"}


def toggle_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    """Toggle discount policy active status."""
    _check_supermarket_admin(db, user_id)
    
    policy = db.query(DiscountPolicy).filter(
        DiscountPolicy.id == policy_id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chinh sach")
    
    policy.is_active = not policy.is_active
    db.commit()

    return {"success": True, "message": "Cap nhat trang thai thanh cong"}


# ========== Discount Calculation ==========
def calculate_discount(
    db: Session,
    base_price: float,
    expiry_date: str,
    supermarket_id: int | None = None,
    product_id: int | None = None,
) -> dict:
    """
    Calculate discount for a product based on expiry date.
    
    Business Rules:
    1. Each product gets ONLY ONE discount policy at a time
    2. Product-specific policy overrides category-specific policy
    3. Category-specific policy overrides supermarket default
    4. Policies must be active and match days range
    """
    try:
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngay het han khong hop le")

    days_left = (expiry - date.today()).days
    
    # 1. PRODUCT-SPECIFIC policies
    if product_id:
        product_policies = db.query(
            DiscountPolicy.id,
            DiscountPolicy.discount_percent,
        ).filter(
            DiscountPolicy.product_id == product_id,
            DiscountPolicy.is_active == True,
            DiscountPolicy.min_days_left <= days_left,
            DiscountPolicy.max_days_left >= days_left
        ).all()
        if product_policies:
            policy = product_policies[0]
            discount_percent = float(policy[1])
            discount_amount = base_price * (discount_percent / 100.0)
            return {
                "discountPercent": discount_percent,
                "originalPrice": float(base_price),
                "discountAmount": discount_amount,
                "finalPrice": float(base_price - discount_amount),
                "appliedLevel": "product",
                "appliedPolicyId": int(policy[0]),
            }

    # 2. CATEGORY policies
    category_id = None
    if product_id:
        category = db.query(Product.category_id).filter(Product.id == product_id).first()
        if category and category.category_id:
            category_id = category.category_id
            category_policies = db.query(
                DiscountPolicy.id,
                DiscountPolicy.discount_percent,
            ).filter(
                DiscountPolicy.category_id == category_id,
                DiscountPolicy.is_active == True,
                DiscountPolicy.min_days_left <= days_left,
                DiscountPolicy.max_days_left >= days_left
            ).all()
            if category_policies:
                policy = category_policies[0]
                discount_percent = float(policy[1])
                discount_amount = base_price * (discount_percent / 100.0)
                return {
                    "discountPercent": discount_percent,
                    "originalPrice": float(base_price),
                    "discountAmount": discount_amount,
                    "finalPrice": float(base_price - discount_amount),
                    "appliedLevel": "category",
                    "appliedPolicyId": int(policy[0]),
                }

    # 3. SUPERMARKET DEFAULT policies
    if supermarket_id:
        supermarket_policies = db.query(
            DiscountPolicy.id,
            DiscountPolicy.discount_percent,
        ).filter(
            DiscountPolicy.supermarket_id == supermarket_id,
            DiscountPolicy.category_id.is_(None),
            DiscountPolicy.product_id.is_(None),
            DiscountPolicy.is_active == True,
            DiscountPolicy.min_days_left <= days_left,
            DiscountPolicy.max_days_left >= days_left
        ).all()
        if supermarket_policies:
            policy = supermarket_policies[0]
            discount_percent = float(policy[1])
            discount_amount = base_price * (discount_percent / 100.0)
            return {
                "discountPercent": discount_percent,
                "originalPrice": float(base_price),
                "discountAmount": discount_amount,
                "finalPrice": float(base_price - discount_amount),
                "appliedLevel": "supermarket_default",
                "appliedPolicyId": int(policy[0]),
            }

    return {
        "discountPercent": 0.0,
        "originalPrice": float(base_price),
        "discountAmount": 0.0,
        "finalPrice": float(base_price),
        "appliedLevel": "none",
        "appliedPolicyId": None,
    }

