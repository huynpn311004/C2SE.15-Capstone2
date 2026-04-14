from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DECIMAL, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    store_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("stores.id"),
        nullable=False,
    )
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("pending", "preparing", "ready", "completed", "cancelled", name="order_status"),
        nullable=False,
        default="pending",
    )
    total_amount: Mapped[Decimal | None] = mapped_column(DECIMAL(10, 2), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(
        Enum("cod", "momo", name="order_payment_method"),
        nullable=True,
    )
    payment_status: Mapped[str] = mapped_column(
        Enum("pending", "paid", name="order_payment_status"),
        nullable=False,
        default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=func.now(),
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
    )
    shipping_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    store: Mapped["Store"] = relationship("Store", foreign_keys=[store_id])
