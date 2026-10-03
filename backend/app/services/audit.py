from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.traceability import AuditEvent
from app.models.user import User


def write_audit(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    actor: Optional[User] = None,
    metadata: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    event = AuditEvent(
        actor_user_id=actor.id if actor else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=metadata or {},
        ip_address=ip_address,
    )
    db.add(event)
    return event
