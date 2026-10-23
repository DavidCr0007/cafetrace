from fastapi import HTTPException
from sqlalchemy.orm import Query, Session

from app.modules.identity.models import User, UserRole
from app.modules.identity.permissions import Permission, has_permission
from app.modules.traceability.models import Batch


def scope_batches(query: Query, user: User) -> Query:
    """Lotes visibles: todos con traceability.read_all; si no, solo los propios."""
    if has_permission(user, Permission.TRACEABILITY_READ_ALL):
        return query
    return query.filter(Batch.producer_id == user.id)


def get_readable_batch(db: Session, batch_id: int, user: User) -> Batch:
    # 404 evita revelar si un lote ajeno existe (protección IDOR).
    batch = scope_batches(db.query(Batch).filter(Batch.id == batch_id), user).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return batch


def can_manage_batch(batch: Batch, user: User) -> bool:
    return has_permission(user, Permission.TRACEABILITY_MANAGE_ALL) or batch.producer_id == user.id


def get_writable_batch(db: Session, batch_id: int, user: User) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch or not can_manage_batch(batch, user):
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return batch


def validate_commercial_owner(db: Session, user_id: int, producer_id: int) -> None:
    """Responsable comercial válido: un vendedor activo o el propio productor que vende directo."""
    candidate = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if candidate and (
        candidate.role == UserRole.SELLER
        or (candidate.role == UserRole.PRODUCER and candidate.id == producer_id)
    ):
        return
    raise HTTPException(status_code=422, detail="El responsable comercial debe ser un vendedor activo o el productor del lote")
