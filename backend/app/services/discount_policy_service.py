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
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng")

    role = (user.role or "").lower()
    if role != "supermarket_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có Quản lý Siêu thị mới có quyền chỉnh sửa chính sách giảm giá.",
        )

    if not user.supermarket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa được gán siêu thị.",
        )

    return int(user.supermarket_id)


def _validate_category_id(db: Session, category_id: int | None) -> None:
    if category_id is None:
        return
    
    exists = db.query(Category).filter(Category.id == category_id).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Danh mục không tồn tại")


def _validate_product_id(db: Session, product_id: int | None) -> None:
    if product_id is None:
        return
    
    exists = db.query(Product.id).filter(Product.id == product_id).first()
    
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tồn tại")


def _check_policy_overlap(
    db: Session,
    supermarket_id: int,
    min_days: int,
    max_days: int,
    category_id: int | None = None,
    product_id: int | None = None,
    exclude_policy_id: int | None = None,
) -> dict:
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
    if user_id:
        scope = db.query(User.role, User.supermarket_id).filter(User.id == user_id).first()
        if scope:
            if scope.role == "supermarket_admin":
                supermarket_id = scope.supermarket_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản không có quyền xem chính sách giảm giá.",
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
            "appliesTo": row[10] or row[9] or "Tất cả sản phẩm",
        }
        for row in rows
    ]

    return {"items": items}


def get_discount_policy(db: Session, policy_id: int) -> dict:
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy chính sách")

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
        "appliesTo": row[10] or row[9] or "Tất cả sản phẩm",
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
    supermarket_id_scope = _check_supermarket_admin(db, user_id)

    name = (name or "").strip()

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên chính sách không được trống")
    if min_days is None or min_days < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày tối thiểu không hợp lệ")
    if max_days is None or max_days < min_days:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày tối đa phải lớn hơn ngày tối thiểu")
    if discount is None or discount < 0 or discount > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phần trăm giảm giá không hợp lệ (0-100)")

    if supermarket_id_scope is not None:
        supermarket_id = supermarket_id_scope
    elif supermarket_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phải chọn siêu thị.",
        )

    # Validate that only one of category_id or product_id is set
    if category_id is not None and product_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chọn Danh mục hoặc Sản phẩm, không chọn cả hai",
        )

    # Validate category and product if provided
    if category_id is not None:
        _validate_category_id(db, category_id)
    if product_id is not None:
        _validate_product_id(db, product_id)

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

    return {"success": True, "message": "Tạo chính sách thành công"}


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
    _check_supermarket_admin(db, user_id)

    if name is not None:
        name = (name or "").strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên chính sách không được trống")
    if min_days is not None and min_days < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày tối thiểu không hợp lệ")
    if max_days is not None and min_days is not None and max_days < min_days:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày tối đa phải lớn hơn ngày tối thiểu")
    if discount is not None and (discount < 0 or discount > 100):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phần trăm giảm giá không hợp lệ (0-100)")

    # Check if policy exists using ORM
    policy = db.query(DiscountPolicy).filter(DiscountPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy chính sách")

    # Validate that only one of category_id or product_id is set
    if category_id is not None and product_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chọn Danh mục hoặc Sản phẩm, không chọn cả hai",
        )

    # Validate category and product if provided
    if category_id is not None:
        _validate_category_id(db, category_id)
    if product_id is not None:
        _validate_product_id(db, product_id)

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
                detail=f"Chính sách xung đột với {overlap_result['count']} chính sách hiện tại. Vui lòng sửa lại các chính sách cũ trước."
            )

    # Build update values dictionary
    update_values = {}
    
    if name is not None:
        update_values["name"] = name
    if min_days is not None:
        update_values["min_days_left"] = min_days
    if max_days is not None:
        update_values["max_days_left"] = max_days
    if discount is not None:
        update_values["discount_percent"] = float(discount)
    if category_id is not None:
        update_values["category_id"] = category_id
    if product_id is not None:
        update_values["product_id"] = product_id
    if is_active is not None:
        update_values["is_active"] = is_active

    if update_values:
        db.execute(
            update(DiscountPolicy)
            .where(DiscountPolicy.id == policy_id)
            .values(**update_values)
        )
        db.commit()

    return {"success": True, "message": "Cập nhật chính sách thành công"}


def delete_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    _check_supermarket_admin(db, user_id)
    result = db.query(DiscountPolicy).filter(
        DiscountPolicy.id == policy_id
    ).delete()
    db.commit()

    if result == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy chính sách")

    return {"success": True, "message": "Xóa chính sách thành công"}


def toggle_discount_policy(db: Session, policy_id: int, user_id: int) -> dict:
    _check_supermarket_admin(db, user_id)
    
    policy = db.query(DiscountPolicy).filter(
        DiscountPolicy.id == policy_id
    ).first()
    
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy chính sách")
    
    policy.is_active = not policy.is_active
    db.commit()

    return {"success": True, "message": "Cập nhật trạng thái thành công"}


# ========== Discount Calculation ==========
def calculate_discount(
    db: Session,
    base_price: float,
    expiry_date: str,
    supermarket_id: int | None = None,
    product_id: int | None = None,
) -> dict:
    try:
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày hết hạn không hợp lệ")

    days_left = (expiry - date.today()).days
    days_left = max(0, days_left)
    policy_days_left = max(1, days_left)
    
    # 1. PRODUCT-SPECIFIC policies
    if product_id:
        product_policies = db.query(
            DiscountPolicy.id,
            DiscountPolicy.discount_percent,
        ).filter(
            DiscountPolicy.product_id == product_id,
            DiscountPolicy.is_active == True,
            DiscountPolicy.min_days_left <= policy_days_left,
            DiscountPolicy.max_days_left >= policy_days_left
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
                DiscountPolicy.min_days_left <= policy_days_left,
                DiscountPolicy.max_days_left >= policy_days_left
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
            DiscountPolicy.min_days_left <= policy_days_left,
            DiscountPolicy.max_days_left >= policy_days_left
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