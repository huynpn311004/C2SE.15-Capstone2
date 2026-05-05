"""Discount policy router - delegates to service layer."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_supermarket_admin
from app.models.user import User
from app.services import discount_policy_service


router = APIRouter(prefix="/discount-policy", tags=["discount-policy"])


# ========== CRUD Operations ==========
@router.get("")
def list_discount_policies(
    supermarket_id: int = Query(default=None),
    current_user: User = Depends(require_supermarket_admin),
    db: Session = Depends(get_db),
):
    return discount_policy_service.list_discount_policies(db, current_user.id, supermarket_id)


@router.get("/{policy_id}")
def get_discount_policy(policy_id: int, db: Session = Depends(get_db)):
    return discount_policy_service.get_discount_policy(db, policy_id)


@router.post("")
def create_discount_policy(
    name: str = Query(...),
    min_days: int = Query(...),
    max_days: int = Query(...),
    discount: float = Query(...),
    supermarket_id: int = Query(default=None),
    category_id: int = Query(default=None),
    product_id: int = Query(default=None),
    is_active: bool = Query(default=True),
    current_user: User = Depends(require_supermarket_admin),
    db: Session = Depends(get_db),
):
    return discount_policy_service.create_discount_policy(
        db,
        current_user.id,
        name,
        min_days,
        max_days,
        discount,
        supermarket_id,
        category_id,
        product_id,
        is_active,
    )


@router.put("/{policy_id}")
def update_discount_policy(
    policy_id: int,
    name: str = Query(default=None),
    min_days: int = Query(default=None),
    max_days: int = Query(default=None),
    discount: float = Query(default=None),
    category_id: int = Query(default=None),
    product_id: int = Query(default=None),
    is_active: bool = Query(default=None),
    current_user: User = Depends(require_supermarket_admin),
    db: Session = Depends(get_db),
):
    """Update discount policy."""
    return discount_policy_service.update_discount_policy(
        db,
        policy_id,
        current_user.id,
        name,
        min_days,
        max_days,
        discount,
        category_id,
        product_id,
        is_active,
    )


@router.delete("/{policy_id}")
def delete_discount_policy(
    policy_id: int,
    current_user: User = Depends(require_supermarket_admin),
    db: Session = Depends(get_db),
):
    return discount_policy_service.delete_discount_policy(db, policy_id, current_user.id)


@router.patch("/{policy_id}/toggle")
def toggle_discount_policy(
    policy_id: int,
    current_user: User = Depends(require_supermarket_admin),
    db: Session = Depends(get_db),
):
    return discount_policy_service.toggle_discount_policy(db, policy_id, current_user.id)


@router.get("/calculate")
def calculate_discount(
    base_price: float = Query(...),
    expiry_date: str = Query(...),
    supermarket_id: int = Query(default=None),
    product_id: int = Query(default=None),
    db: Session = Depends(get_db),
):
    return discount_policy_service.calculate_discount(
        db, base_price, expiry_date, supermarket_id, product_id
    )



