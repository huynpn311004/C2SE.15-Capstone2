"""Common FastAPI dependencies"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User

security = HTTPBearer()


def get_current_user(
	credentials: HTTPAuthorizationCredentials = Depends(security),
	db: Session = Depends(get_db)
) -> User:
	"""Get current user from JWT token"""
	token = credentials.credentials
	print(f"[DEBUG] Token received: {token[:50]}...")

	payload = verify_token(token)
	print(f"[DEBUG] Payload: {payload}")

	if payload is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Token không hợp lệ hoặc đã hết hạn.",
			headers={"WWW-Authenticate": "Bearer"},
		)

	user_id = payload.get("sub")
	print(f"[DEBUG] User ID from token: {user_id} (type: {type(user_id).__name__})")

	if user_id is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Token không hợp lệ.",
			headers={"WWW-Authenticate": "Bearer"},
		)

	try:
		user_id = int(user_id)
	except (ValueError, TypeError):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Token không hợp lệ.",
			headers={"WWW-Authenticate": "Bearer"},
		)

	user = db.query(User).filter(User.id == user_id).first()
	print(f"[DEBUG] User from DB: {user.username if user else 'NOT FOUND'}")

	if user is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Người dùng không tồn tại.",
			headers={"WWW-Authenticate": "Bearer"},
		)

	if not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Tài khoản đã bị vô hiệu hóa.",
		)

	return user


def require_supermarket_admin(current_user: User = Depends(get_current_user)) -> User:
	"""Verify user has supermarket admin role."""
	if current_user.role != "supermarket_admin":
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Bạn không có quyền truy cập trang này.",
		)
	return current_user