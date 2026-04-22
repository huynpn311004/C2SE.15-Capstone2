from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_supermarket_admin
from app.services import coupon_service

router = APIRouter(prefix="/coupon", tags=["coupon"])


@router.get("/", response_model=dict)
def list_coupons(
    db: Session = Depends(get_db),
    current_user=Depends(require_supermarket_admin),
):
    return coupon_service.list_coupons(db, current_user.supermarket_id)


@router.post("/", response_model=dict)
def create_coupon(
    code: str = Query(...),
    description: str = Query(default=None),
    discount: float = Query(...),
    min_amount: float = Query(default=None),
    max_uses: int = Query(default=None),
    valid_from: str = Query(...),
    valid_to: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_supermarket_admin),
):
    return coupon_service.create_coupon(
        db,
        current_user.supermarket_id,
        code,
        description,
        discount,
        min_amount,
        max_uses,
        valid_from,
        valid_to,
    )


@router.put("/{coupon_id}", response_model=dict)
def update_coupon(
    coupon_id: int,
    code: str = Query(default=None),
    description: str = Query(default=None),
    discount: float = Query(default=None),
    min_amount: float = Query(default=None),
    max_uses: int = Query(default=None),
    valid_from: str = Query(default=None),
    valid_to: str = Query(default=None),
    is_active: bool = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_supermarket_admin),
):
    """Update a coupon."""
    return coupon_service.update_coupon(
        db,
        coupon_id,
        current_user.supermarket_id,
        code,
        description,
        discount,
        min_amount,
        max_uses,
        valid_from,
        valid_to,
        is_active,
    )


@router.delete("/{coupon_id}", response_model=dict)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_supermarket_admin),
):
    """Delete a coupon."""
    return coupon_service.delete_coupon(db, coupon_id, current_user.supermarket_id)


@router.patch("/{coupon_id}/toggle", response_model=dict)
def toggle_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_supermarket_admin),
):
    """Toggle coupon active/inactive status."""
    return coupon_service.toggle_coupon(db, coupon_id, current_user.supermarket_id)
