from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_supermarket_admin
from app.models.user import User
from app.schemas.supermarket_admin_schemas import (
    StoresListResponse,
    CreateStoreRequest,
    UpdateStoreRequest,
    UpdateStaffRequest,
)
from app.schemas.admin_schemas import (
    UpdateUserRequest,
    ChangePasswordRequest,
)
from app.services import supermarket_admin_service, product_service, admin_service, wallet_service


router = APIRouter(prefix="/supermarket-admin", tags=["supermarket-admin"])


# ========== Dashboard ==========
@router.get("/dashboard-summary")
def get_supermarket_dashboard_summary(
    period: str = Query(default="daily"),
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.get_dashboard_summary(db, current_user.id, period)


@router.get("/reports")
def get_supermarket_reports(
    range: str = Query(default="30d", pattern="^(7d|30d|90d)$"),
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Map range to period: 7d=weekly, 30d/monthly=monthly
    period_map = {"7d": "weekly", "30d": "monthly", "90d": "monthly"}
    period = period_map.get(range, "monthly")
    return supermarket_admin_service.get_dashboard_summary(db, current_user.id, period)


# ========== Supermarket Profile ==========
@router.get("/profile")
def get_supermarket_profile(
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return supermarket_admin_service.get_supermarket_profile(db, current_user.id)


@router.put("/profile")
def update_supermarket_profile(
	name: str,
	address: str = "",
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return supermarket_admin_service.update_supermarket_profile(db, current_user.id, name, address)


# ========== Store Management ==========
@router.get("/stores", response_model=StoresListResponse)
def list_stores(
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
    return supermarket_admin_service.list_stores(db, current_user.id)


@router.post("/stores")
def create_store(
    data: CreateStoreRequest,
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.create_store(
        db,
        current_user.id,
        data.name,
        data.address,
        data.code,
        data.phone,
        data.latitude,
        data.longitude,
    )


@router.put("/stores/{store_id}")
def update_store(
    store_id: int,
    data: UpdateStoreRequest,
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.update_store(
        db,
        current_user.id,
        store_id,
        data.name,
        data.address,
        data.phone,
        data.latitude,
        data.longitude,
    )


@router.delete("/stores/{store_id}")
def delete_store(
    store_id: int,
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.delete_store(db, current_user.id, store_id)


# ========== Products & Categories for Policy Configuration ==========
@router.get("/products")
def list_all_products(
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = supermarket_admin_service._get_supermarket_scope(db, current_user.id)
    return product_service.list_products(db, scope, None, None)


@router.get("/categories")
def list_all_categories(
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = supermarket_admin_service._get_supermarket_scope(db, current_user.id)
    return product_service.list_product_categories(db, scope)


# ========== Donation Monitoring ==========
@router.get("/donations")
def list_donation_monitoring(
	status_filter: str = Query(default="all"),
    store_id: int | None = Query(default=None),
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.list_donation_monitoring(db, current_user.id, status_filter, store_id)


@router.get("/donations/{request_id}")
def get_donation_detail(
	request_id: int,
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    detail = supermarket_admin_service.get_donation_detail(db, current_user.id, request_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn quyên góp")
    return detail


# ========== Staff Management ==========
@router.get("/staff")
def list_supermarket_staff(
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.list_supermarket_staff(db, current_user.id)


@router.put("/staff/{staff_id}")
def update_supermarket_staff(
    staff_id: int,
    data: UpdateStaffRequest,
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.update_staff(
        db, current_user.id, staff_id, data.fullName, data.email, data.phone, data.storeId
    )


@router.patch("/staff/{staff_id}/toggle-lock")
def toggle_supermarket_staff_lock(
    staff_id: int,
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.toggle_staff_lock(db, current_user.id, staff_id)


@router.delete("/staff/{staff_id}")
def delete_supermarket_staff(
    staff_id: int,
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.delete_staff(db, current_user.id, staff_id)


# ========== Audit Log ==========
@router.get("/audit-logs")
def list_supermarket_audit_logs(
	store_id: int | None = Query(default=None),
	action: str | None = Query(default=None),
	entity_type: str | None = Query(default=None),
	from_date: str | None = Query(default=None),
	to_date: str | None = Query(default=None),
	limit: int = Query(default=200, ge=1, le=1000),
	offset: int = Query(default=0, ge=0),
	_=Depends(require_supermarket_admin),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return supermarket_admin_service.list_supermarket_audit_logs(
        db,
        current_user.id,
        store_id=store_id,
        action=action,
        entity_type=entity_type,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )


# ========== Expiring Products ==========
@router.get("/expiring-products")
def list_expiring_products(
    days: int = Query(default=7, ge=1, le=90, description="Số ngày còn lại để xem sản phẩm sắp hết hạn"),
    store_id: int | None = Query(default=None, description="Lọc theo store cụ thể"),
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.list_expiring_products(
        db,
        current_user.id,
        days=days,
        store_id=store_id,
    )


@router.get("/wallet/history")
def get_wallet_history(
    limit: int = Query(default=50, ge=1, le=100),
    store_id: int | None = Query(default=None),
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.get_wallet_transactions(db, current_user.id, limit, store_id)


# ========== User Management (Self) ==========
@router.put("/user/{user_id}")
def update_supermarket_admin_user(
    user_id: int,
    data: UpdateUserRequest,
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền cập nhật thông tin của người khác."
        )
    return admin_service.update_user(
        db,
        user_id,
        data.username,
        data.fullName,
        data.email,
        data.phone,
    )


@router.post("/user/change-password")
def change_supermarket_admin_password(
    data: ChangePasswordRequest,
    _=Depends(require_supermarket_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return admin_service.change_user_password(
        db,
        current_user.id,
        data.currentPassword,
        data.newPassword,
    )
