from decimal import Decimal

from sqlalchemy import BigInteger, DECIMAL, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("supermarket_id", "sku", name="uq_sm_sku"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    supermarket_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supermarkets.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("categories.id"),
        nullable=True,
    )
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)