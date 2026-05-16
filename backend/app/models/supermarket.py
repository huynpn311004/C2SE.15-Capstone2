from decimal import Decimal
from sqlalchemy import BigInteger, DateTime, Float, String, func, DECIMAL
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Supermarket(Base):
    __tablename__ = "supermarkets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    wallet_balance: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal('0.00'))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=func.now())