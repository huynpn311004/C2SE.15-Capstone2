from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DonationRequestItem(Base):
    """Individual item within a donation request (similar to OrderItem)."""
    __tablename__ = "donation_request_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("donation_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    offer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("donation_offers.id"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")

    # Relationships
    request: Mapped["DonationRequest"] = relationship("DonationRequest", back_populates="items")
