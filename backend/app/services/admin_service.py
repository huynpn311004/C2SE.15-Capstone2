from datetime import datetime, timedelta
from decimal import Decimal
import re

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, func, case
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.supermarket import Supermarket
from app.models.charity_organization import CharityOrganization
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.store import Store
from app.models.delivery import Delivery


# ========== Helper Functions ==========

def _dict_row(row) -> dict:
	"""Convert SQLAlchemy row to dictionary"""
	return dict(row._mapping)


def _format_datetime(value) -> str | None:
	"""Format datetime to readable string"""
	if not value:
		return None
	if isinstance(value, datetime):
		return value.strftime("%Y-%m-%d %H:%M")
	return str(value)


def _format_date(value) -> str:
	"""Format date to readable string"""
	if not value:
		return datetime.now().strftime("%Y-%m-%d")
	if isinstance(value, datetime):
		return value.strftime("%Y-%m-%d")
	return str(value)[:10]


def _bool_from_db(value) -> bool:
	"""Convert database value to boolean"""
	if isinstance(value, bool):
		return value
	if value is None:
		return False
	return int(value) == 1


def _display_role(role: str | None) -> str:
	"""Display user-friendly role name"""
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
	"""Generate unique username based on email and suffix"""
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
	"""Get supermarket admin user"""
	return db.query(User.id, User.full_name, User.email, User.phone, User.is_active).filter(
		User.supermarket_id == supermarket_id,
		User.role == 'supermarket_admin'
	).order_by(User.id).first()


# ========== Dashboard & Reports ==========

def get_dashboard_summary(db: Session) -> dict:
	"""Get dashboard summary statistics"""
	supermarkets_count = db.query(func.count(Supermarket.id)).scalar() or 0
	charities_count = db.query(func.count(CharityOrganization.id)).scalar() or 0
	users_count = db.query(func.count(User.id)).filter(User.role != 'system_admin').scalar() or 0

	pending_supermarkets = db.query(func.count(Supermarket.id)).outerjoin(
		User, and_(
			User.supermarket_id == Supermarket.id,
			User.role == 'supermarket_admin'
		)
	).filter(User.id.is_(None)).scalar() or 0

	pending_charities = db.query(func.count(CharityOrganization.id)).outerjoin(
		User, User.id == CharityOrganization.user_id
	).filter(User.id.is_(None)).scalar() or 0

	pending_deliveries = db.query(func.count(DeliveryPartner.id)).outerjoin(
		User, User.id == DeliveryPartner.user_id
	).filter(User.id.is_(None)).scalar() or 0

	return {
		"supermarkets": int(supermarkets_count),
		"charities": int(charities_count),
		"users": int(users_count),
		"pendingRequests": int(pending_supermarkets + pending_charities + pending_deliveries),
	}


def get_reports(db: Session, days: int = 30) -> dict:
	"""Get reports and analytics"""
	current_from = datetime.now() - timedelta(days=days)
	previous_from = datetime.now() - timedelta(days=days * 2)

	# Current period metrics using ORM with aggregate functions
	metrics = db.query(
		func.coalesce(
			func.sum(case((Order.payment_status == 'paid', Order.total_amount), else_=0)), 0
		).label("revenue"),
		func.count(Order.id).label("orders"),
		func.coalesce(
			func.sum(case((Order.status == 'completed', 1), else_=0)), 0
		).label("completed_orders")
	).filter(Order.created_at >= current_from).first()

	current_revenue = float(metrics.revenue or 0)
	current_orders = int(metrics.orders or 0)
	completed_orders = int(metrics.completed_orders or 0)
	delivered_rate = (completed_orders * 100.0 / current_orders) if current_orders else 0.0

	# Previous period order count
	previous_orders = db.query(func.count(Order.id)).filter(
		and_(Order.created_at >= previous_from, Order.created_at < current_from)
	).scalar() or 0

	# Previous period revenue
	revenue_trend = db.query(
		func.coalesce(
			func.sum(case((Order.payment_status == 'paid', Order.total_amount), else_=0)), 0
		)
	).filter(
		and_(Order.created_at >= previous_from, Order.created_at < current_from)
	).scalar() or 0

	# Active delivery partners
	active_partners = db.query(func.count(User.id)).filter(
		and_(User.role == 'delivery_partner', User.is_active == 1)
	).scalar() or 0

	# Top supermarkets by orders
	top_supermarkets_query = db.query(
		Supermarket.name,
		func.count(Order.id).label("orders")
	).join(Store, Store.supermarket_id == Supermarket.id)\
	 .join(Order, Order.store_id == Store.id)\
	 .filter(Order.created_at >= current_from)\
	 .group_by(Supermarket.id, Supermarket.name)\
	 .order_by(func.count(Order.id).desc())\
	 .limit(4)

	top_supermarkets = [
		{"name": row.name, "orders": int(row.orders or 0)}
		for row in top_supermarkets_query.all()
	]

	# Top delivery partners with metrics
	top_delivery_query = db.query(
		func.coalesce(User.full_name, func.concat('Partner #', func.cast(DeliveryPartner.id, str))).label("name"),
		func.count(Delivery.id).label("total_deliveries"),
		func.coalesce(
			func.sum(case((Delivery.status == 'delivered', 1), else_=0)), 0
		).label("delivered_count"),
		func.avg(
			case(
				(Delivery.delivered_at.isnot(None),
				 func.extract('epoch', Delivery.delivered_at - Delivery.assigned_at) / 60),
				else_=None
			)
		).label("avg_minutes")
	).join(DeliveryPartner, DeliveryPartner.id == Delivery.delivery_partner_id)\
	 .outerjoin(User, User.id == DeliveryPartner.user_id)\
	 .filter(Delivery.assigned_at >= current_from)\
	 .group_by(DeliveryPartner.id, User.full_name)\
	 .order_by(func.sum(case((Delivery.status == 'delivered', 1), else_=0)).desc())\
	 .limit(3)

	top_delivery = [
		{
			"name": row.name,
			"completion": f"{(int(row.delivered_count or 0) * 100.0 / int(row.total_deliveries or 1)):.1f}%" if row.total_deliveries else "0%",
			"avgTime": f"{int(row.avg_minutes) if row.avg_minutes else 0} phút"
		}
		for row in top_delivery_query.all()
	]

	previous_orders = int(previous_orders)
	previous_revenue = float(previous_orders and revenue_trend or 0)

	order_growth = ((current_orders - previous_orders) * 100.0 / previous_orders) if previous_orders else 0.0
	revenue_growth = ((current_revenue - previous_revenue) * 100.0 / previous_revenue) if previous_revenue else 0.0

	supermarket_rows = [
		{
			"name": item["name"],
			"orders": item["orders"],
			"growth": "N/A",
		}
		for item in top_supermarkets
	]

	return {
		"metrics": {
			"revenue": f"{current_revenue:,.0f} VND".replace(",", "."),
			"orders": f"{current_orders:,}".replace(",", "."),
			"deliveredRate": f"{delivered_rate:.1f}%",
			"activePartners": str(int(active_partners)),
			"revenueTrend": f"{revenue_growth:+.1f}%",
			"ordersTrend": f"{order_growth:+.1f}%",
		},
		"supermarketTop": supermarket_rows,
		"deliveryTop": top_delivery,
	}


# ========== Audit Logs ==========
def list_audit_logs(
	db: Session,
	action: str = None,
	entity_type: str = None,
	user_keyword: str = None,
	from_date: str = None,
	to_date: str = None,
	limit: int = 200,
	offset: int = 0,
) -> dict:
	"""List audit logs with filters (system-admin view)."""
	from app.models.audit_log import AuditLog
	from app.models.user import User

	q = (
		db.query(AuditLog, User)
		.outerjoin(User, AuditLog.user_id == User.id)
	)

	if action:
		q = q.filter(AuditLog.action == action.strip())

	if entity_type:
		q = q.filter(AuditLog.entity_type == entity_type.strip())

	if user_keyword:
		keyword = f"%{user_keyword.strip()}%"
		q = q.filter(
			or_(
				User.username.ilike(keyword),
				User.full_name.ilike(keyword),
				User.email.ilike(keyword)
			)
		)

	if from_date:
		q = q.filter(AuditLog.created_at >= from_date)

	if to_date:
		from datetime import datetime as dt
		to_date_obj = dt.fromisoformat(to_date)
		to_date_next = to_date_obj.replace(hour=0, minute=0, second=0) + timedelta(days=1)
		q = q.filter(AuditLog.created_at < to_date_next)

	total = q.count()
	rows = (
		q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
		 .limit(limit)
		 .offset(offset)
		 .all()
	)

	items = []
	for audit_log, user in rows:
		actor = (
			(user.full_name if user else None)
			or (user.username if user else None)
			or (user.email if user else None)
			or "System"
		)
		items.append({
			"id": audit_log.id,
			"userId": audit_log.user_id,
			"storeId": audit_log.store_id,
			"actor": actor,
			"action": audit_log.action,
			"entityType": audit_log.entity_type,
			"entityId": audit_log.entity_id,
			"time": audit_log.created_at.strftime("%Y-%m-%d %H:%M") if audit_log.created_at else "-",
		})

	return {"items": items, "total": total, "limit": limit, "offset": offset}


# ========== User Management ==========

def list_users(db: Session) -> dict:
	"""List all non-admin users"""
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
	"""Toggle user lock status"""
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
	"""Update user information"""
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
			detail="Email đã tồn tại.",
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
	"""Change user password"""
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
	"""Delete a user"""
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

	db.query(User).filter(User.id == user_id).delete()
	db.commit()
	return {"success": True}
# ========== Supermarket Management ==========

def list_supermarkets(db: Session) -> dict:
	"""List all supermarkets"""
	# Get supermarkets with their admin users
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
					   email: str, phone: str, address: str) -> dict:
	"""Update supermarket information"""
	if not name or not email or not director:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	db.query(Supermarket).filter(Supermarket.id == supermarket_id).update({
		Supermarket.name: name,
		Supermarket.address: address or None
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
	"""Create or update supermarket account"""
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
						 phone: str, address: str, password: str, activity_status: str) -> dict:
	"""Create new supermarket with account"""
	if not name or not director or not email or len(password) < 6:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

	try:
		# Create supermarket using ORM
		new_supermarket = Supermarket(name=name, address=address or None)
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
	"""Toggle supermarket lock status"""
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
	"""Delete supermarket"""
	try:
		db.query(User).filter(User.supermarket_id == supermarket_id).delete()
		db.query(Supermarket).filter(Supermarket.id == supermarket_id).delete()
		db.commit()
		return {"success": True}
	except SQLAlchemyError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Cannot delete supermarket with related data",
		) from exc


# ========== Charity Management ==========

def list_charities(db: Session) -> dict:
	"""List all charities"""
	rows = db.query(
		CharityOrganization.id,
		CharityOrganization.org_name,
		CharityOrganization.phone,
		CharityOrganization.address,
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


def update_charity(db: Session, charity_id: int, name: str, director: str, email: str, phone: str, address: str) -> dict:
	"""Update charity information"""
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
		CharityOrganization.address: address or None
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
	"""Create or update charity account"""
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
								phone: str, address: str, password: str, password_status: str) -> dict:
	"""Create new charity with account"""
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
			address=address or None
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
	"""Toggle charity lock status"""
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
	"""Delete charity"""
	charity = db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).first()
	if charity and charity.user_id:
		db.query(User).filter(User.id == charity.user_id).delete()
	db.query(CharityOrganization).filter(CharityOrganization.id == charity_id).delete()
	db.commit()
	return {"success": True}


# ========== Delivery Partner Management ==========

def list_delivery_partners(db: Session) -> dict:
	"""List all delivery partners"""
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
	"""Update delivery partner information"""
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
	"""Create or update delivery account"""
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
	"""Create new delivery partner with account"""
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
	"""Toggle delivery partner lock status"""
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
	"""Delete delivery partner"""
	delivery = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).first()
	if delivery and delivery.user_id:
		db.query(User).filter(User.id == delivery.user_id).delete()
	db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery_id).delete()
	db.commit()
	return {"success": True}
