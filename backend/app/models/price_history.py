from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, DECIMAL, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lot_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("inventory_lots.id"),
        nullable=False,
    )
    old_price: Mapped[Decimal | None] = mapped_column(DECIMAL(12, 2), nullable=True)
    new_price: Mapped[Decimal | None] = mapped_column(DECIMAL(12, 2), nullable=True)
    changed_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=func.now(),
    )