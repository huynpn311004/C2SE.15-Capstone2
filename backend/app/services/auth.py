from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.security import get_password_hash, verify_password
from app.models.store import Store
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest

ALLOWED_ROLES = {
	"system_admin",
	"supermarket_admin",
	"store_staff",
	"customer",
	"charity",
	"delivery_partner",
}

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKED_ACCOUNT_DETAIL = (
	"Tài khoản đã bị khóa do đăng nhập sai qua 5 lần. "
	"Vui lòng liên hệ admin qua email admin@seims.vn."
)


def register_user(db: Session, payload: RegisterRequest) -> User:
	username = payload.username.strip()
	email = payload.email.strip().lower()
	full_name = payload.full_name.strip()
	phone = payload.phone.strip() if payload.phone else None
	role = payload.role.strip().lower() if payload.role else "customer"
	store_id = payload.store_id

	if role not in ALLOWED_ROLES:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Vai trò không hợp lệ.",
		)

	resolved_store = None
	if store_id is not None:
		resolved_store = db.query(Store).filter(Store.id == store_id).first()
		if not resolved_store:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Store không tồn tại.",
			)
		if role != "store_staff":
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Chỉ tài khoản Store Staff mới được gán store.",
			)

	existing_user = (
		db.query(User)
		.filter(or_(User.username == username, User.email == email))
		.first()
	)
	if existing_user:
		if existing_user.username == username:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Tên đăng nhập đã tồn tại.",
			)
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email đã được sử dụng.",
		)

	user = User(
		username=username,
		email=email,
		full_name=full_name,
		phone=phone,
		role=role,
		store_id=resolved_store.id if resolved_store else None,
		supermarket_id=resolved_store.supermarket_id if resolved_store else None,
		is_active=True,
	)
	try:
		user.password_hash = get_password_hash(payload.password)
	except ValueError as exc:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"Mật khẩu không hợp lệ: {exc}",
		) from exc
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


def login_user(db: Session, payload: LoginRequest) -> User:
	identity = payload.username.strip()
	user = (
		db.query(User)
		.filter(or_(User.username == identity, User.email == identity.lower()))
		.first()
	)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Thông tin đăng nhập không chính xác.",
		)
	if not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_423_LOCKED,
			detail=LOCKED_ACCOUNT_DETAIL,
		)

	if not verify_password(payload.password, user.password_hash):
		current_attempts = int(user.failed_login_attempts or 0) + 1
		user.failed_login_attempts = current_attempts

		if current_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
			user.is_active = False
			user.locked_at = datetime.utcnow()
			db.commit()
			raise HTTPException(
				status_code=status.HTTP_423_LOCKED,
				detail=LOCKED_ACCOUNT_DETAIL,
			)

		db.commit()
		remaining_attempts = MAX_FAILED_LOGIN_ATTEMPTS - current_attempts
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail=(
				"Thông tin đăng nhập không chính xác. "
				f"Bạn còn {remaining_attempts} lần thử trước khi tài khoản bị khóa."
			),
		)

	user.last_login_at = datetime.utcnow()
	if user.failed_login_attempts:
		user.failed_login_attempts = 0
	db.commit()
	return user


def forgot_password(db: Session, email: str) -> bool:
	user = db.query(User).filter(User.email == email.lower()).first()
	if user:
		user.reset_token = generate_reset_token()
		user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
		db.commit()
		return True
	return False


def reset_password(db: Session, token: str, new_password: str) -> bool:
	user = db.query(User).filter(
		User.reset_token == token,
		User.reset_token_expires > datetime.utcnow(),
	).first()
	if not user:
		return False
	user.password_hash = get_password_hash(new_password)
	user.reset_token = None
	user.reset_token_expires = None
	db.commit()
	return True


def generate_reset_token() -> str:
	import secrets
	return secrets.token_urlsafe(32)
