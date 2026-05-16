from datetime import datetime, timedelta
from decimal import Decimal
import re

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, func, case, String, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.supermarket import Supermarket
from app.models.charity_organization import CharityOrganization
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.store import Store
from app.models.delivery import Delivery
from app.models.donation_request import DonationRequest
from app.models.wallet_transaction import WalletTransaction


# ========== Helper Functions ==========

def _dict_row(row) -> dict:
	return dict(row._mapping)


def _format_datetime(value) -> str | None:
	if not value:
		return None
	if isinstance(value, datetime):
		return value.strftime("%Y-%m-%d %H:%M")
	return str(value)


def _format_date(value) -> str:
	if not value:
		return datetime.now().strftime("%Y-%m-%d")
	if isinstance(value, datetime):
		return value.strftime("%Y-%m-%d")
	return str(value)[:10]


def _bool_from_db(value) -> bool:
	if isinstance(value, bool):
		return value
	if value is None:
		return False
	return int(value) == 1


def _display_role(role: str | None) -> str:
	role_map = {
		"system_admin": "System Admin",
		"supermarket_admin": "Supermarket Admin",
		"store_staff": "Store Staff",
		"customer": "Customer",
		"charity": "Charity Organization",
		"delivery_partner": "Delivery Partner",
	}
	return role_map.get((role or "").lower(), role or "Unknown")


def _generate_username(db: Session, email: str, suffix: str) -> str:
	base = email.split("@", 1)[0].strip().lower() or "user"
	candidate = f"{base}_{suffix}".replace(" ", "")
	index = 1

	while True:
		existing = db.query(User).filter(User.username == candidate).first()
		if not existing:
			return candidate
		index += 1
		candidate = f"{base}_{suffix}_{index}".replace(" ", "")


def _get_supermarket_admin(db: Session, supermarket_id: int):
	return db.query(User.id, User.full_name, User.email, User.phone, User.is_active).filter(
		User.supermarket_id == supermarket_id,
		User.role == 'supermarket_admin'
	).order_by(User.id).first()


# ========== Dashboard ==========

def get_dashboard_summary(db: Session) -> dict:
	# 1. Chỉ đếm các Siêu thị đang hoạt động (có tài khoản admin và không bị khóa)
	active_supermarkets_count = db.query(func.count(Supermarket.id)).join(
		User, and_(User.supermarket_id == Supermarket.id, User.role == 'supermarket_admin')
	).filter(User.is_active == 1).scalar() or 0

	# 2. Chỉ đếm các Tổ chức từ thiện đang hoạt động (tài khoản không bị khóa)
	active_charities_count = db.query(func.count(CharityOrganization.id)).join(
		User, User.id == CharityOrganization.user_id
	).filter(User.is_active == 1).scalar() or 0

	# 3. Chỉ đếm các Đối tác giao hàng đang hoạt động
	active_deliveries_count = db.query(func.count(DeliveryPartner.id)).join(
		User, User.id == DeliveryPartner.user_id
	).filter(User.is_active == 1).scalar() or 0

	# 4. Đếm tổng số người dùng đang hoạt động (trừ system_admin)
	active_users_count = db.query(func.count(User.id)).filter(
		User.role != 'system_admin',
		User.is_active == 1
	).scalar() or 0

	return {
		"supermarkets": int(active_supermarkets_count),
		"charities": int(active_charities_count),
		"deliveries": int(active_deliveries_count),
		"users": int(active_users_count),
	}




def get_reports(db: Session, days: int = 30) -> dict:
	current_from = datetime.now() - timedelta(days=days)

	# 1. Tính lợi nhuận vận chuyển từ Đơn hàng (Order)
	# Chỉ tính các đơn đã hoàn thành (completed) trong khoảng thời gian yêu cầu
	order_fees = db.query(Order.shipping_fee).filter(
		and_(Order.status == 'completed', Order.created_at >= current_from)
	).all()
	
	order_profit = Decimal('0')
	for o in order_fees:
		fee = Decimal(str(o.shipping_fee or 0))
		# Platform lấy 20% hoa hồng từ phí vận chuyển
		order_profit += (fee * Decimal('0.2'))

	# 2. Tính lợi nhuận vận chuyển từ Quyên góp (DonationRequest)
	donation_fees = db.query(DonationRequest.shipping_fee).filter(
		and_(DonationRequest.status == 'RECEIVED', DonationRequest.created_at >= current_from)
	).all()
	
	donation_profit = Decimal('0')
	for d in donation_fees:
		fee = Decimal(str(d.shipping_fee or 0))
		# Platform lấy 20% hoa hồng
		donation_profit += (fee * Decimal('0.2'))

	current_shipping_profit = order_profit + donation_profit

	# 3. Đếm số shipper đang hoạt động (đã kích hoạt tài khoản)
	active_partners = db.query(func.count(User.id)).filter(
		and_(User.role == 'delivery_partner', User.is_active == 1)
	).scalar() or 0

	return {
		"metrics": {
			"activePartners": str(int(active_partners)),
			"shippingProfit": f"{current_shipping_profit:,.0f} VND".replace(",", "."),
			# Giữ các trường này nhưng để giá trị mặc định để tránh lỗi frontend (nếu có)
			"revenue": "0 VND",
			"orders": "0",
			"deliveredRate": "0%",
			"revenueTrend": "+0%",
			"ordersTrend": "+0%",
		},
		"supermarketTop": [],
		"deliveryTop": [],
	}



# ========== User Management ==========

def list_users(db: Session) -> dict:
	rows = db.query(
		User.id,
		User.username,
		User.full_name,
		User.email,
		User.phone,
		User.role,
		User.is_active,
		User.created_at,
		User.last_login_at,
		Supermarket.name.label('supermarket_name'),
		Supermarket.address.label('supermarket_address'),
		Store.name.label('store_name')
	).outerjoin(
		Supermarket, Supermarket.id == User.supermarket_id
	).outerjoin(
		Store, Store.id == User.store_id
	).filter(
		User.role != 'system_admin'
	).order_by(
		User.created_at.desc(), User.id.desc()
	).all()

	data = []
	for row in rows:
		item = _dict_row(row)
		data.append(
			{
				"id": item["id"],
				"username": item["username"],
				"fullName": item["full_name"],
				"email": item["email"],
				"phone": item["phone"],
				"role": _display_role(item["role"]),
				"status": "active" if _bool_from_db(item["is_active"]) else "inactive",
				"joinDate": _format_date(item["created_at"]),
				"lastLogin": _format_datetime(item["last_login_at"]) or "-",
				"supermarket": item["supermarket_name"] or "N/A",
				"supermarketAddress": item["supermarket_address"] or "",
				"store": item["store_name"] or "-",
			}
		)

	return {"items": data}


def toggle_user_lock(db: Session, user_id: int) -> dict:
	user = db.query(
		User.id, User.is_active, User.role
	).filter(User.id == user_id).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if (user.role or "").lower() == "system_admin":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Không thể khóa tài khoản System Admin.",
		)

	next_active = 0 if _bool_from_db(user.is_active) else 1
	new_locked_at = None if next_active == 1 else datetime.now()
	db.query(User).filter(User.id == user_id).update({
		User.is_active: next_active,
		User.failed_login_attempts: case(
			(next_active == 1, 0),
			else_=User.failed_login_attempts
		),
		User.locked_at: new_locked_at
	}, synchronize_session=False)
	db.commit()

	return {"success": True}


def update_user(db: Session, user_id: int, username: str = None, full_name: str = None, 
				email: str = None, phone: str = None) -> dict:
	row = db.query(
		User.id, User.username
	).filter(User.id == user_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	username = row.username if username is None else str(username).strip()
	full_name = (full_name or "").strip()
	email = (email or "").strip().lower()
	phone = (phone or "").strip()

	if not username or not full_name or not email:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	if not re.fullmatch(r"[a-zA-Z0-9._-]{3,100}", username):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Username phải từ 3-100 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang.",
		)

	existing_username = db.query(User.id).filter(
		and_(User.username == username, User.id != user_id)
	).first()
	if existing_username:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Tên đăng nhập đã tồn tại.",
		)

	existing_email = db.query(User.id).filter(
		and_(User.email == email, User.id != user_id)
	).first()
	if existing_email:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email đã được sử dụng",
		)

	if phone:
		existing_phone = db.query(User.id).filter(
			and_(User.phone == phone, User.id != user_id)
		).first()
		if existing_phone:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Số điện thoại đã được sử dụng",
			)

	db.query(User).filter(User.id == user_id).update({
		User.username: username,
		User.full_name: full_name,
		User.email: email,
		User.phone: phone or None
	}, synchronize_session=False)
	db.commit()
	return {"success": True}


def change_user_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
	if len(new_password) < 6:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mật khẩu mới phải có ít nhất 6 ký tự.",
		)

	row = db.query(
		User.id, User.password_hash
	).filter(User.id == user_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if not verify_password(current_password, row.password_hash):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Mật khẩu hiện tại không đúng.",
		)

	db.query(User).filter(User.id == user_id).update({
		User.password_hash: get_password_hash(new_password),
		User.failed_login_attempts: 0,
		User.locked_at: None
	}, synchronize_session=False)
	db.commit()
	return {"success": True}


def delete_user(db: Session, user_id: int) -> dict:
	user = db.query(
		User.id, User.role
	).filter(User.id == user_id).first()
	if not user:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	if (user.role or "").lower() == "system_admin":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Không thể xóa tài khoản System Admin.",
		)

	# Check for orders if customer
	if (user.role or "").lower() == "customer":
		has_orders = db.query(Order.id).filter(Order.customer_id == user_id).first()
		if has_orders:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Không thể xóa khách hàng này vì đã có lịch sử đơn hàng. Hãy khóa tài khoản thay vì xóa."
			)

	db.query(User).filter(User.id == user_id).delete()
	db.commit()
	return {"success": True}
# ========== Supermarket Management ==========

def list_supermarkets(db: Session) -> dict:
	supermarkets = db.query(Supermarket).order_by(
		Supermarket.created_at.desc(), Supermarket.id.desc()
	).all()

	data = []
	for s in supermarkets:
		admin = db.query(
			User.id, User.username, User.full_name, User.email, User.phone, 
			User.address, User.is_active
		).filter(
			and_(
				User.supermarket_id == s.id,
				User.role == 'supermarket_admin'
			)
		).order_by(User.id).first()

		account_created = admin is not None
		is_locked = account_created and (not _bool_from_db(admin.is_active))
		data.append(
			{
				"id": s.id,
				"name": s.name,
				"address": s.address or "",
				"latitude": float(s.latitude) if s.latitude else None,
				"longitude": float(s.longitude) if s.longitude else None,
				"email": admin.email or "" if admin else "",
				"phone": admin.phone or "" if admin else "",
				"requestDate": _format_date(s.created_at),
				"status": "active" if (not is_locked and account_created) else "inactive",
				"director": admin.full_name or "" if admin else "",
				"isLocked": bool(is_locked),
				"accountCreated": bool(account_created),
				"accountUsername": admin.username or "" if admin else "",
				"accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
			}
		)

	return {"items": data}


def update_supermarket(db: Session, supermarket_id: int, name: str, director: str,
					   email: str, phone: str, address: str, latitude: float = None, 
					   longitude: float = None) -> dict:
	if not name or not email or not director:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	db.query(Supermarket).filter(Supermarket.id == supermarket_id).update({
		Supermarket.name: name,
		Supermarket.address: address or None,
		Supermarket.latitude: latitude,
		Supermarket.longitude: longitude
	}, synchronize_session=False)

	admin = _get_supermarket_admin(db, supermarket_id)
	if admin:
		db.query(User).filter(User.id == admin.id).update({
			User.full_name: director,
			User.email: email,
			User.phone: phone or None
		}, synchronize_session=False)

	db.commit()
	return {"success": True}


def create_supermarket_account(db: Session, supermarket_id: int, name: str, director: str, 
							   email: str, phone: str, password: str, activity_status: str) -> dict:
	if not name or not director or not email or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	try:
		db.query(Supermarket).filter(Supermarket.id == supermarket_id).update({
			Supermarket.name: name
		}, synchronize_session=False)

		is_active = 0 if activity_status == "locked" else 1
		password_hash = get_password_hash(password)
		admin = _get_supermarket_admin(db, supermarket_id)

		if admin:
			db.query(User).filter(User.id == admin.id).update({
				User.full_name: director,
				User.email: email,
				User.phone: phone or None,
				User.is_active: is_active,
				User.password_hash: password_hash,
				User.failed_login_attempts: 0,
				User.locked_at: None if is_active == 1 else datetime.now()
			}, synchronize_session=False)
		else:
			username = _generate_username(db, email, f"sm{supermarket_id}")
			new_user = User(
				supermarket_id=supermarket_id,
				username=username,
				email=email,
				password_hash=password_hash,
				full_name=director,
				phone=phone or None,
				role='supermarket_admin',
				is_active=is_active,
				failed_login_attempts=0
			)
			db.add(new_user)
			db.flush()

		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo/cập nhật tài khoản siêu thị. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc
	return {"success": True}


def create_supermarket_with_account(db: Session, name: str, director: str, email: str, 
						 phone: str, address: str, password: str, activity_status: str,
						 latitude: float = None, longitude: float = None) -> dict:
	if not name or not director or not email or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	try:
		# Create supermarket using ORM
		new_supermarket = Supermarket(name=name, address=address or None, latitude=latitude, longitude=longitude)
		db.add(new_supermarket)
		db.flush()  # Flush to get the ID
		supermarket_id = new_supermarket.id

		if not supermarket_id:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Không thể tạo siêu thị mới.",
			)

		is_active = 0 if activity_status == "locked" else 1
		password_hash = get_password_hash(password)
		username = _generate_username(db, email, f"sm{int(supermarket_id)}")

		# Create user using ORM
		new_user = User(
			supermarket_id=int(supermarket_id),
			username=username,
			email=email,
			password_hash=password_hash,
			full_name=director,
			phone=phone or None,
			address=address or None,
			role='supermarket_admin',
			is_active=is_active,
			failed_login_attempts=0
		)
		db.add(new_user)
		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo tài khoản siêu thị. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc

	return {"success": True, "supermarketId": int(supermarket_id)}


def toggle_supermarket_lock(db: Session, supermarket_id: int) -> dict:
	users = db.query(
		User.id, User.is_active
	).filter(
		and_(
			User.supermarket_id == supermarket_id,
			User.role.in_(['supermarket_admin', 'store_staff'])
		)
	).all()

	if not users:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No users for this supermarket")

	any_active = any(_bool_from_db(row.is_active) for row in users)
	next_active = 0 if any_active else 1

	db.query(User).filter(
		and_(
			User.supermarket_id == supermarket_id,
			User.role.in_(['supermarket_admin', 'store_staff'])
		)
	).update({
		User.is_active: next_active,
		User.failed_login_attempts: case(
			(next_active == 1, 0),
			else_=User.failed_login_attempts
		),
		User.locked_at: None if next_active == 1 else datetime.now()
	}, synchronize_session=False)

	db.commit()
	return {"success": True}


def delete_supermarket(db: Session, supermarket_id: int) -> dict:
	# Check for orders in any store of this supermarket
	has_orders = db.query(Order.id).join(Store, Store.id == Order.store_id).filter(
		Store.supermarket_id == supermarket_id
	).first()
	
	if has_orders:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể xóa siêu thị này vì đã có dữ liệu đơn hàng liên quan. Hãy khóa tài khoản thay vì xóa."
		)

	try:
		db.query(User).filter(User.supermarket_id == supermarket_id).delete()
		# Stores will be deleted by CASCADE in DB if configured, but let's be safe
		db.query(Store).filter(Store.supermarket_id == supermarket_id).delete()
		db.query(Supermarket).filter(Supermarket.id == supermarket_id).delete()
		db.commit()
		return {"success": True}
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"Lỗi khi xóa siêu thị: {str(exc)}"
		)


# ========== Charity Management ==========

def list_charities(db: Session) -> dict:
	rows = db.query(
		CharityOrganization.id,
		CharityOrganization.org_name,
		CharityOrganization.phone,
		CharityOrganization.address,
		CharityOrganization.latitude,
		CharityOrganization.longitude,
		CharityOrganization.user_id,
		User.username,
		User.full_name,
		User.email,
		User.phone.label('user_phone'),
		User.is_active,
		User.created_at
	).outerjoin(
		User, User.id == CharityOrganization.user_id
	).order_by(CharityOrganization.id.desc()).all()

	data = []
	for row in rows:
		account_created = row.user_id is not None
		is_locked = account_created and (not _bool_from_db(row.is_active))
		data.append(
			{
				"id": row.id,
				"name": row.org_name,
				"email": row.email or "",
				"phone": row.phone or row.user_phone or "",
				"address": row.address or "",
				"latitude": float(row.latitude) if row.latitude else None,
				"longitude": float(row.longitude) if row.longitude else None,
				"requestDate": _format_date(row.created_at),
				"director": row.full_name or "",
				"isLocked": bool(is_locked),
				"accountCreated": bool(account_created),
				"accountUsername": row.username or "",
				"accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
				"passwordStatus": "locked" if is_locked else ("active" if account_created else ""),
			}
		)

	return {"items": data}


def update_charity(db: Session, charity_id: int, name: str, director: str, email: str, 
				   phone: str, address: str, latitude: float = None, longitude: float = None) -> dict:
	if not name or not director or not email:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	charity = db.query(
		CharityOrganization.id, CharityOrganization.user_id
	).filter(CharityOrganization.id == charity_id).first()
	if not charity:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity not found")

	db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).update({
		CharityOrganization.org_name: name,
		CharityOrganization.phone: phone or None,
		CharityOrganization.address: address or None,
		CharityOrganization.latitude: latitude,
		CharityOrganization.longitude: longitude
	}, synchronize_session=False)

	if charity.user_id:
		db.query(User).filter(User.id == charity.user_id).update({
			User.full_name: director,
			User.email: email,
			User.phone: phone or None
		}, synchronize_session=False)

	db.commit()
	return {"success": True}


def create_charity_account(db: Session, charity_id: int, name: str, director: str, 
						   email: str, phone: str, address: str, password: str, password_status: str) -> dict:
	if not name or not director or not email or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	charity = db.query(
		CharityOrganization.id, CharityOrganization.user_id
	).filter(CharityOrganization.id == charity_id).first()
	if not charity:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity not found")

	is_active = 0 if password_status == "locked" else 1
	password_hash = get_password_hash(password)

	try:
		db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).update({
			CharityOrganization.org_name: name,
			CharityOrganization.phone: phone or None,
			CharityOrganization.address: address or None
		}, synchronize_session=False)

		if charity.user_id:
			db.query(User).filter(User.id == charity.user_id).update({
				User.full_name: director,
				User.email: email,
				User.phone: phone or None,
				User.is_active: is_active,
				User.password_hash: password_hash,
				User.role: 'charity',
				User.failed_login_attempts: 0,
				User.locked_at: None if is_active == 1 else datetime.now()
			}, synchronize_session=False)
		else:
			username = _generate_username(db, email, f"charity{charity_id}")
			new_user = User(
				username=username,
				email=email,
				password_hash=password_hash,
				full_name=director,
				phone=phone or None,
				role='charity',
				is_active=is_active,
				failed_login_attempts=0
			)
			db.add(new_user)
			db.flush()
			db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).update({
				CharityOrganization.user_id: new_user.id
			}, synchronize_session=False)

		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo/cập nhật tài khoản charity. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc
	return {"success": True}


def create_charity_with_account(db: Session, name: str, director: str, email: str, 
								phone: str, address: str, password: str, password_status: str,
								latitude: float = None, longitude: float = None) -> dict:
	if not name or not director or not email or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	is_active = 0 if password_status == "locked" else 1
	password_hash = get_password_hash(password)

	try:
		username = _generate_username(db, email, "charity")
		new_user = User(
			username=username,
			email=email,
			password_hash=password_hash,
			full_name=director,
			phone=phone or None,
			role='charity',
			is_active=is_active,
			failed_login_attempts=0
		)
		db.add(new_user)
		db.flush()
		user_id = new_user.id

		new_charity = CharityOrganization(
			user_id=user_id,
			org_name=name,
			phone=phone or None,
			address=address or None,
			latitude=latitude,
			longitude=longitude
		)
		db.add(new_charity)
		db.flush()
		charity_id = new_charity.id

		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo tài khoản charity. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc

	return {"success": True, "charityId": int(charity_id or 0)}


def toggle_charity_lock(db: Session, charity_id: int) -> dict:
	row = db.query(
		User.id, User.is_active
	).join(
		CharityOrganization, User.id == CharityOrganization.user_id
	).filter(CharityOrganization.id == charity_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity account not found")

	next_active = 0 if _bool_from_db(row.is_active) else 1
	db.query(User).filter(User.id == row.id).update({
		User.is_active: next_active,
		User.failed_login_attempts: case(
			(next_active == 1, 0),
			else_=User.failed_login_attempts
		),
		User.locked_at: None if next_active == 1 else datetime.now()
	}, synchronize_session=False)
	db.commit()
	return {"success": True}


def delete_charity(db: Session, charity_id: int) -> dict:
	# Check for donation requests
	has_requests = db.query(DonationRequest.id).filter(DonationRequest.charity_id == charity_id).first()
	if has_requests:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể xóa tổ chức từ thiện này vì đã có yêu cầu quyên góp liên quan. Hãy khóa tài khoản thay vì xóa."
		)

	charity = db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).first()
	if charity and charity.user_id:
		db.query(User).filter(User.id == charity.user_id).delete()
	db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).delete()
	db.commit()
	return {"success": True}


# ========== Delivery Partner Management ==========

def list_delivery_partners(db: Session) -> dict:
	rows = db.query(
		DeliveryPartner.id,
		DeliveryPartner.phone,
		DeliveryPartner.vehicle_type,
		DeliveryPartner.vehicle_plate,
		DeliveryPartner.user_id,
		User.username,
		User.full_name,
		User.email,
		User.is_active,
		User.created_at
	).outerjoin(
		User, User.id == DeliveryPartner.user_id
	).order_by(DeliveryPartner.id.desc()).all()

	data = []
	for row in rows:
		account_created = row.user_id is not None
		is_locked = account_created and (not _bool_from_db(row.is_active))
		data.append(
			{
				"id": row.id,
				"name": row.full_name or f"Delivery #{row.id}",
				"manager": row.full_name or "",
				"email": row.email or "",
				"phone": row.phone or "",
				"vehicleType": row.vehicle_type or "",
				"licensePlate": row.vehicle_plate or "",
				"requestDate": _format_date(row.created_at),
				"isLocked": bool(is_locked),
				"accountCreated": bool(account_created),
				"accountUsername": row.username or "",
				"accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
				"passwordStatus": "locked" if is_locked else ("active" if account_created else ""),
			}
		)

	return {"items": data}


def update_delivery_partner(db: Session, delivery_id: int, manager: str, email: str, 
							 phone: str, vehicle_type: str, license_plate: str) -> dict:
	if not manager or not email or not phone:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	row = db.query(
		DeliveryPartner.id, DeliveryPartner.user_id
	).filter(DeliveryPartner.id == delivery_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery partner not found")

	db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).update({
		DeliveryPartner.phone: phone,
		DeliveryPartner.vehicle_type: vehicle_type or None,
		DeliveryPartner.vehicle_plate: license_plate or None
	}, synchronize_session=False)

	if row.user_id:
		db.query(User).filter(User.id == row.user_id).update({
			User.full_name: manager,
			User.email: email,
			User.phone: phone
		}, synchronize_session=False)

	db.commit()
	return {"success": True}


def create_delivery_account(db: Session, delivery_id: int, manager: str, email: str, 
							 phone: str, vehicle_type: str, license_plate: str, 
							 password: str, password_status: str) -> dict:
	if not manager or not email or not phone or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	row = db.query(
		DeliveryPartner.id, DeliveryPartner.user_id
	).filter(DeliveryPartner.id == delivery_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery partner not found")

	is_active = 0 if password_status == "locked" else 1
	password_hash = get_password_hash(password)

	try:
		db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).update({
			DeliveryPartner.phone: phone,
			DeliveryPartner.vehicle_type: vehicle_type or None,
			DeliveryPartner.vehicle_plate: license_plate or None
		}, synchronize_session=False)

		if row.user_id:
			db.query(User).filter(User.id == row.user_id).update({
				User.full_name: manager,
				User.email: email,
				User.phone: phone,
				User.is_active: is_active,
				User.password_hash: password_hash,
				User.role: 'delivery_partner',
				User.failed_login_attempts: 0,
				User.locked_at: None if is_active == 1 else datetime.now()
			}, synchronize_session=False)
		else:
			username = _generate_username(db, email, f"delivery{delivery_id}")
			new_user = User(
				username=username,
				email=email,
				password_hash=password_hash,
				full_name=manager,
				phone=phone,
				role='delivery_partner',
				is_active=is_active,
				failed_login_attempts=0
			)
			db.add(new_user)
			db.flush()
			db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).update({
				DeliveryPartner.user_id: new_user.id
			}, synchronize_session=False)

		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo/cập nhật tài khoản partner. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc
	return {"success": True}


def create_delivery_with_account(db: Session, manager: str, email: str, 
								 phone: str, vehicle_type: str, license_plate: str,
								 password: str, password_status: str) -> dict:
	if not manager or not email or not phone or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	is_active = 0 if password_status == "locked" else 1
	password_hash = get_password_hash(password)

	try:
		username = _generate_username(db, email, "delivery")
		new_user = User(
			username=username,
			email=email,
			password_hash=password_hash,
			full_name=manager,
			phone=phone,
			role='delivery_partner',
			is_active=is_active,
			failed_login_attempts=0
		)
		db.add(new_user)
		db.flush()
		user_id = new_user.id

		new_delivery = DeliveryPartner(
			user_id=user_id,
			phone=phone,
			vehicle_type=vehicle_type or None,
			vehicle_plate=license_plate or None
		)
		db.add(new_delivery)
		db.commit()
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể tạo tài khoản delivery partner. Kiểm tra email hoặc dữ liệu trùng.",
		) from exc

	return {"success": True}


def toggle_delivery_lock(db: Session, delivery_id: int) -> dict:
	row = db.query(
		User.id, User.is_active
	).join(
		DeliveryPartner, User.id == DeliveryPartner.user_id
	).filter(DeliveryPartner.id == delivery_id).first()
	if not row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery account not found")

	next_active = 0 if _bool_from_db(row.is_active) else 1
	db.query(User).filter(User.id == row.id).update({
		User.is_active: next_active,
		User.failed_login_attempts: case(
			(next_active == 1, 0),
			else_=User.failed_login_attempts
		),
		User.locked_at: None if next_active == 1 else datetime.now()
	}, synchronize_session=False)
	db.commit()
	return {"success": True}


def delete_delivery_partner(db: Session, delivery_id: int) -> dict:
	# Check for deliveries
	has_deliveries = db.query(Delivery.id).filter(Delivery.delivery_partner_id == delivery_id).first()
	if has_deliveries:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Không thể xóa đối tác vận chuyển này vì đã có lịch sử giao hàng. Hãy khóa tài khoản thay vì xóa."
		)

	delivery = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).first()
	if delivery and delivery.user_id:
		db.query(User).filter(User.id == delivery.user_id).delete()
	db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).delete()
	db.commit()
	return {"success": True}
