from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    supermarket_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supermarkets.id", ondelete="CASCADE"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    discount_percent: Mapped[float] = mapped_column(nullable=False)  # 0-100
    min_amount: Mapped[float] = mapped_column(nullable=True, default=0)  # Giá tối thiểu để áp dụng
    max_uses: Mapped[int] = mapped_column(nullable=True, default=None)  # Số lần dùng tối đa (None = unlimited)
    current_uses: Mapped[int] = mapped_column(nullable=False, default=0)
    valid_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)