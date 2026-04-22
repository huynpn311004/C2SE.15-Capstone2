from sqlalchemy import BigInteger, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class DeliveryPartner(Base):
    __tablename__ = "delivery_partners"
    __table_args__ = (UniqueConstraint("user_id", name="uq_dp_user"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    vehicle_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    vehicle_plate: Mapped[str | None] = mapped_column(String(50), nullable=True)