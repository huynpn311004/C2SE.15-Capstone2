import json
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
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        store_id=store_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=json.dumps(old_value) if old_value else None,
        new_value=json.dumps(new_value) if new_value else None,
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
            "old_value": json.loads(r.old_value) if r.old_value else None,
            "new_value": json.loads(r.new_value) if r.new_value else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
