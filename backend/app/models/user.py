from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class User(Base):
	__tablename__ = "users"

	id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
	supermarket_id: Mapped[int | None] = mapped_column(
		BigInteger,
		ForeignKey("supermarkets.id", ondelete="SET NULL"),
		nullable=True,
	)
	store_id: Mapped[int | None] = mapped_column(
		BigInteger,
		ForeignKey("stores.id", ondelete="SET NULL"),
		nullable=True,
	)

	username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
	email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
	password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
	full_name: Mapped[str] = mapped_column(String(255), nullable=False)
	phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
	address: Mapped[str | None] = mapped_column(String(255), nullable=True)

	role: Mapped[str] = mapped_column(String(30), nullable=False, default="customer")
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	failed_login_attempts: Mapped[int] = mapped_column(
		BigInteger,
		nullable=False,
		default=0,
	)
	locked_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=False), nullable=True)
	last_login_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=False), nullable=True)
	reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
	reset_token_expires: Mapped[DateTime | None] = mapped_column(DateTime(timezone=False), nullable=True)
	created_at: Mapped[DateTime] = mapped_column(
		DateTime(timezone=False), nullable=False, server_default=func.now()
	)