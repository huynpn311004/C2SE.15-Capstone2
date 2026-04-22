"""Audit log service — centralizes all audit logging logic.

Usage:
    from app.services.audit_service import log_action, query_audit_logs

    # Inside any business logic, AFTER the action succeeds:
    log_action(db, user_id=5, store_id=3, action="CREATE_PRODUCT", entity_type="product", entity_id=42)

    # Query logs for a store:
    logs = query_audit_logs(db, store_id=3, limit=50, offset=0)
"""

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.core.audit_actions import ALL_ACTIONS


def log_action(
    db: Session,
    user_id: int,
    store_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
) -> AuditLog:
    """Create an audit log entry.

    Call this AFTER the business action completes successfully.
    Commits within the same transaction — if the caller already committed,
    this is safe (no-op on double-commit). If the caller hasn't committed,
    this persists the log alongside the business change.

    Args:
        db: SQLAlchemy session.
        user_id: ID of the user performing the action.
        store_id: ID of the store the action targets.
        action: One of the constants in audit_actions.py
                (e.g. CREATE_PRODUCT, UPDATE_PRICE, CANCEL_ORDER).
        entity_type: Type of entity affected (e.g. "product", "order").
        entity_id: Primary key of the affected entity.

    Returns:
        The created AuditLog record.
    """
    entry = AuditLog(
        user_id=user_id,
        store_id=store_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def query_audit_logs(
    db: Session,
    store_id: int | None = None,
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    """Query audit logs with optional filters.

    Results are always sorted newest-first (created_at DESC).

    Args:
        store_id: Filter by store (recommended).
        user_id: Filter by actor.
        action: Filter by specific action (e.g. "CREATE_PRODUCT").
        entity_type: Filter by entity type (e.g. "product").
        entity_id: Filter by specific entity PK.
        limit: Max records to return (default 200).
        offset: Skip first N records for pagination.

    Returns:
        List of dicts with: id, user_id, store_id, action, entity_type,
        entity_id, created_at (as ISO string).
    """
    q = db.query(AuditLog)

    if store_id is not None:
        q = q.filter(AuditLog.store_id == store_id)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    if action is not None:
        q = q.filter(AuditLog.action == action)
    if entity_type is not None:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)

    rows = (
        q.order_by(AuditLog.created_at.desc())
         .limit(limit)
         .offset(offset)
         .all()
    )

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "store_id": r.store_id,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
