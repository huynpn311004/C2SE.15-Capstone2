from fastapi import APIRouter, Depends, Query, HTTPException, status, Path, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.admin_schemas import (
    UpdateUserRequest,
    ChangePasswordRequest,
    UpdateSupermarketRequest,
    CreateSupermarketAccountRequest,
    UpdateCharityRequest,
    CreateCharityAccountRequest,
    UpdateDeliveryPartnerRequest,
    CreateDeliveryAccountRequest,
)
from app.services import admin_service
from app.services.customer_service import restore_expired_reserved_stock

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verify user has system admin role"""
    if current_user.role != "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập trang này."
        )
    return current_user


# ========== Dashboard & Reports ==========

@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
	return admin_service.get_dashboard_summary(db)


# ========== User Management ==========

@router.get("/users")
def list_users(_=Depends(require_admin), db: Session = Depends(get_db)):
	return admin_service.list_users(db)


@router.patch("/users/{user_id}/toggle-lock")
def toggle_user_lock(user_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.toggle_user_lock(db, user_id)


@router.put("/users/{user_id}")
def update_user(user_id: int, data: UpdateUserRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.update_user(
		db,
		user_id,
		data.username,
		data.fullName,
		data.email,
		data.phone,
	)


@router.post("/users/{user_id}/change-password")
def change_user_password(user_id: int, data: ChangePasswordRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.change_user_password(
		db,
		user_id,
		data.currentPassword,
		data.newPassword,
	)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.delete_user(db, user_id)


# ========== Supermarket Management ==========

@router.get("/supermarkets")
def list_supermarkets(db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.list_supermarkets(db)


@router.put("/supermarkets/{supermarket_id}")
def update_supermarket(supermarket_id: int, data: UpdateSupermarketRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.update_supermarket(
		db,
		supermarket_id,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.address.strip() if data.address else "",
	)


@router.post("/supermarkets/{supermarket_id}/create-account")
def create_supermarket_account(supermarket_id: int, data: CreateSupermarketAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_supermarket_account(
		db,
		supermarket_id,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.password,
		data.activityStatus.strip().lower(),
	)


@router.post("/supermarkets/create-account")
def create_supermarket_with_account(data: CreateSupermarketAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_supermarket_with_account(
		db,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.address.strip() if data.address else "",
		data.password,
		data.activityStatus.strip().lower(),
	)


@router.patch("/supermarkets/{supermarket_id}/toggle-lock")
def toggle_supermarket_lock(supermarket_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.toggle_supermarket_lock(db, supermarket_id)


@router.delete("/supermarkets/{supermarket_id}")
def delete_supermarket(supermarket_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.delete_supermarket(db, supermarket_id)


# ========== Charity Management ==========

@router.get("/charities")
def list_charities(db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.list_charities(db)


@router.put("/charities/{charity_id}")
def update_charity(charity_id: int, data: UpdateCharityRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.update_charity(
		db,
		charity_id,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.address.strip() if data.address else "",
	)


@router.post("/charities/{charity_id}/create-account")
def create_charity_account(charity_id: int, data: CreateCharityAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_charity_account(
		db,
		charity_id,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.address.strip() if data.address else "",
		data.password,
		data.passwordStatus.strip().lower(),
	)


@router.post("/charities/create-account")
def create_charity_with_account(data: CreateCharityAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_charity_with_account(
		db,
		data.name.strip(),
		data.director.strip(),
		data.email.strip().lower(),
		data.phone.strip() if data.phone else "",
		data.address.strip() if data.address else "",
		data.password,
		data.passwordStatus.strip().lower(),
	)


@router.patch("/charities/{charity_id}/toggle-lock")
def toggle_charity_lock(charity_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.toggle_charity_lock(db, charity_id)


@router.delete("/charities/{charity_id}")
def delete_charity(charity_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.delete_charity(db, charity_id)


# ========== Delivery Partner Management ==========

@router.get("/deliveries")
def list_delivery_partners(db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.list_delivery_partners(db)


@router.put("/deliveries/{delivery_id}")
def update_delivery_partner(delivery_id: int, data: UpdateDeliveryPartnerRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.update_delivery_partner(
		db,
		delivery_id,
		data.manager.strip(),
		data.email.strip().lower(),
		data.phone.strip(),
		data.vehicleType.strip() if data.vehicleType else "",
		data.licensePlate.strip() if data.licensePlate else "",
	)


@router.post("/deliveries/{delivery_id}/create-account")
def create_delivery_account(delivery_id: int, data: CreateDeliveryAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_delivery_account(
		db,
		delivery_id,
		data.manager.strip(),
		data.email.strip().lower(),
		data.phone.strip(),
		data.vehicleType.strip() if data.vehicleType else "",
		data.licensePlate.strip() if data.licensePlate else "",
		data.password,
		data.passwordStatus.strip().lower(),
	)


@router.post("/deliveries/create-account")
def create_delivery_with_account(data: CreateDeliveryAccountRequest, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.create_delivery_with_account(
		db,
		data.manager.strip(),
		data.email.strip().lower(),
		data.phone.strip(),
		data.vehicleType.strip(),
		data.licensePlate.strip(),
		data.password,
		data.activityStatus.strip().lower(),
	)


@router.patch("/deliveries/{delivery_id}/toggle-lock")
def toggle_delivery_lock(delivery_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.toggle_delivery_lock(db, delivery_id)


@router.delete("/deliveries/{delivery_id}")
def delete_delivery_partner(delivery_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
	return admin_service.delete_delivery_partner(db, delivery_id)


# ========== Inventory Management ==========

@router.post("/cleanup-expired-reservations")
def cleanup_expired_reservations(
	timeout_minutes: int = Query(default=15, ge=1),
	db: Session = Depends(get_db),
	_: None = Depends(require_admin),
):
	"""
	Manual trigger to restore expired reserved stock for unpaid orders.
	This runs automatically every 5 minutes, but can be triggered manually if needed.
	"""
	return restore_expired_reserved_stock(db, timeout_minutes)
