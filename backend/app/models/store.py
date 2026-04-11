from sqlalchemy import BigInteger, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Store(Base):
    __tablename__ = "stores"
    __table_args__ = (
        UniqueConstraint("supermarket_id", "code", name="uq_sm_store_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    supermarket_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supermarkets.id", ondelete="CASCADE"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)