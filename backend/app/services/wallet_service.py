from typing import Any
from sqlalchemy.orm import Session
from decimal import Decimal
from app.models.wallet_transaction import WalletTransaction
from app.models.user import User

def get_wallet_history(db: Session, entity_type: str, entity_id: int, limit: int = 50):
    return (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.entity_type == entity_type,
            WalletTransaction.entity_id == entity_id
        )
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .all()
    )

def add_transaction(db: Session, entity_type: str, entity_id: int, amount: Any, transaction_type: str, description: str = None, reference_id: int = None, reference_type: str = None):
    import logging
    logger = logging.getLogger(__name__)
    decimal_amount = Decimal(str(amount))
    logger.info(f"Wallet Transaction: {entity_type}#{entity_id} | {transaction_type} | amount: {decimal_amount}")
    
    
    # 1. Tạo giao dịch mới
    new_tx = WalletTransaction(
        entity_type=entity_type,
        entity_id=entity_id,
        amount=decimal_amount,
        transaction_type=transaction_type,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type
    )
    db.add(new_tx)
    
    # 2. Cập nhật số dư (Chuyển sang logic đa đối tượng)
    if entity_type == 'user':
        from app.models.user import User
        target = db.query(User).filter(User.id == entity_id).with_for_update().first()
        balance_attr = 'wallet_balance'
    elif entity_type == 'shipper':
        from app.models.delivery_partner import DeliveryPartner
        target = db.query(DeliveryPartner).filter(DeliveryPartner.id == entity_id).with_for_update().first()
        balance_attr = 'wallet_balance'
    elif entity_type == 'supermarket':
        from app.models.supermarket import Supermarket
        target = db.query(Supermarket).filter(Supermarket.id == entity_id).with_for_update().first()
        balance_attr = 'wallet_balance'
    else:
        target = None

    if target:
        current_balance = Decimal(str(getattr(target, balance_attr) or 0))
            
        if transaction_type in ('deposit', 'refund', 'reward', 'shipping_fee', 'order_payment'):
            new_balance = current_balance + decimal_amount
            setattr(target, balance_attr, new_balance)
            logger.info(f"Balance UPDATED (ADD): {current_balance} -> {new_balance}")
        elif transaction_type in ('payment', 'withdrawal', 'order_settlement', 'commission'):
            new_balance = current_balance - decimal_amount
            setattr(target, balance_attr, new_balance)
            logger.info(f"Balance UPDATED (SUB): {current_balance} -> {new_balance}")

        db.add(target)
        db.flush()
    
    return new_tx
