from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
	username: str = Field(min_length=3, max_length=100)
	email: str = Field(max_length=255)
	password: str = Field(min_length=6, max_length=128)
	full_name: str = Field(min_length=1, max_length=255)
	phone: str | None = Field(default=None, max_length=20)
	role: str = Field(default="customer", max_length=30)
	store_id: int | None = Field(default=None, ge=1)


class LoginRequest(BaseModel):
	username: str = Field(min_length=1, max_length=255)
	password: str = Field(min_length=1, max_length=128)


class UserPublic(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	username: str
	email: str
	full_name: str
	phone: str | None
	role: str
	is_active: bool


class RegisterResponse(BaseModel):
	message: str
	user: UserPublic


class LoginResponse(BaseModel):
	message: str
	user: UserPublic


class ForgotPasswordRequest(BaseModel):
	email: str = Field(max_length=255)


class ForgotPasswordResponse(BaseModel):
	message: str
	success: bool


class ResetPasswordRequest(BaseModel):
	token: str = Field(min_length=1)
	new_password: str = Field(min_length=6, max_length=128)


class ResetPasswordResponse(BaseModel):
	message: str
	success: bool
