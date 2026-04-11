from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth_schemas import (
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	UserPublic,
	ForgotPasswordRequest,
	ForgotPasswordResponse,
	ResetPasswordRequest,
	ResetPasswordResponse,
)
from app.services.auth_services import login_user, register_user, forgot_password, reset_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
	user = register_user(db, data)
	return RegisterResponse(message="Đăng ký thành công.", user=UserPublic.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
	user = login_user(db, data)
	return LoginResponse(message="Đăng nhập thành công.", user=UserPublic.model_validate(user))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_route(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
	forgot_password(db, data.email)
	return ForgotPasswordResponse(
		message="Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.",
		success=True,
	)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password_route(data: ResetPasswordRequest, db: Session = Depends(get_db)):
	success = reset_password(db, data.token, data.new_password)
	if not success:
		from fastapi import HTTPException, status
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Token không hợp lệ hoặc đã hết hạn.",
		)
	return ResetPasswordResponse(message="Mật khẩu đã được đặt lại thành công.", success=True)
