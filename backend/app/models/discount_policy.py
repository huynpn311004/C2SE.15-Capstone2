from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, DECIMAL, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DiscountPolicy(Base):
    __tablename__ = "discount_policies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    supermarket_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supermarkets.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Near-expiry")
    min_days_left: Mapped[int] = mapped_column(Integer, nullable=False)
    max_days_left: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
