from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, DECIMAL, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)

    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    reference_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, server_default=func.now())
