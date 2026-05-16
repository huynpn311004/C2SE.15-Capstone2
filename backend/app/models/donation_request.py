from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func, DECIMAL, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    charity_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    request_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    shipping_fee: Mapped[Decimal | None] = mapped_column(DECIMAL(12, 2), nullable=True, default=0)
    delivery_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=func.now())

    # Relationships
    items: Mapped[list["DonationRequestItem"]] = relationship("DonationRequestItem", back_populates="request", cascade="all, delete-orphan", lazy="selectin")
