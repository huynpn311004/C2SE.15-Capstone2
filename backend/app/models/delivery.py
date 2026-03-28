from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Delivery(Base):
    __tablename__ = "deliveries"
    __table_args__ = (UniqueConstraint("delivery_code", name="uq_delivery_code"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_code: Mapped[str] = mapped_column(String(50), nullable=False)
    order_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=True,
    )
    donation_request_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("donation_requests.id", ondelete="CASCADE"),
        nullable=True,
    )
    store_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("stores.id"),
        nullable=False,
    )
    delivery_partner_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_partners.id"),
        nullable=False,
    )
    receiver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receiver_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    receiver_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="assigned")
    proof_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=func.now(),
    )
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
