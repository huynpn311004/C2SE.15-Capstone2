from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
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
from app.services.auth import login_user, register_user, forgot_password, reset_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
	user = register_user(db, payload)
	return RegisterResponse(message="Dang ky thanh cong.", user=UserPublic.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
	user = login_user(db, payload)
	return LoginResponse(message="Dang nhap thanh cong.", user=UserPublic.model_validate(user))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_route(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
	forgot_password(db, payload.email)
	return ForgotPasswordResponse(
		message="Neu email ton tai trong he thong, chung toi da gui link dat lai mat khau.",
		success=True,
	)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password_route(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
	success = reset_password(db, payload.token, payload.new_password)
	if not success:
		from fastapi import HTTPException, status
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Token khong hop le hoac da het han.",
		)
	return ResetPasswordResponse(message="Mat khau da duoc dat lai thanh cong.", success=True)
