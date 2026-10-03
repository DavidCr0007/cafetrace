from datetime import datetime, timezone
import secrets
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_active_admin
from app.core.database import get_db
from app.models.batch import Batch
from app.models.order import Order
from app.models.product import Product
from app.models.traceability import AuditEvent, IoTDevice, BlockchainNotarization
from app.models.user import User, UserRole, PasswordResetRequest
from app.schemas.user import AdminUserUpdate, PasswordResetApproval, AccessCodeRotateResponse
from app.core.security import get_password_hash, hash_access_code
from app.services.audit import write_audit
from app.core.permissions import Permission, require_permission

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.DASHBOARD_SUMMARY_READ))):
    return {
        "users": db.query(User).count(),
        "batches": db.query(Batch).count(),
        "products": db.query(Product).count(),
        "orders": db.query(Order).count(),
        "iot_devices": db.query(IoTDevice).count(),
        "notarized_batches": db.query(BlockchainNotarization).filter(BlockchainNotarization.status == "confirmed").count(),
        "audit_events": db.query(AuditEvent).count(),
    }


@router.get("/audit-events")
def audit_events(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.AUDIT_READ)),
):
    events = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit).all()
    return [{"id": e.id, "action": e.action, "resource_type": e.resource_type, "resource_id": e.resource_id, "metadata": e.metadata_json, "actor_user_id": e.actor_user_id, "timestamp": e.timestamp} for e in events]


@router.get("/access-matrix")
def access_matrix(_: User = Depends(get_current_active_admin)):
    from app.core.permissions import ROLE_PERMISSIONS
    return {role.value: sorted(permission.value for permission in permissions) for role, permissions in ROLE_PERMISSIONS.items()}


@router.patch("/users/{user_id}")
def update_user_access(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_active_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if payload.email and payload.email != user.email and db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=422, detail="El administrador actual no puede desactivarse a sí mismo")
    if user.role == UserRole.ADMIN and (payload.role and payload.role != UserRole.ADMIN or payload.is_active is False):
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True), User.id != user.id).count()
        if active_admins == 0:
            raise HTTPException(status_code=422, detail="Debe existir al menos un administrador activo")
    for field in ("email", "full_name", "role", "is_active"):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, value)
    write_audit(db, "user.access_updated", "user", str(user.id), admin, {"role": user.role.value, "is_active": user.is_active})
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/access-code", response_model=AccessCodeRotateResponse)
def rotate_access_code(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_active_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    access_code = secrets.token_urlsafe(12)
    user.access_code_hash = hash_access_code(access_code)
    write_audit(db, "user.access_code_rotated", "user", str(user.id), admin)
    db.commit()
    return {"user_id": user.id, "access_code": access_code}


@router.get("/password-reset-requests")
def password_reset_requests(db: Session = Depends(get_db), _: User = Depends(get_current_active_admin)):
    requests = db.query(PasswordResetRequest).order_by(PasswordResetRequest.requested_at.desc()).limit(100).all()
    return [{"id": item.id, "user_id": item.user_id, "email": item.requested_email, "status": item.status, "expires_at": item.expires_at, "requested_at": item.requested_at} for item in requests]


@router.post("/password-reset-requests/{request_id}/approve")
def approve_password_reset(request_id: int, payload: PasswordResetApproval, db: Session = Depends(get_db), admin: User = Depends(get_current_active_admin)):
    request = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="Solicitud pendiente no encontrada")
    if request.expires_at < datetime.now(timezone.utc):
        request.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="La solicitud expiró")
    user = db.query(User).filter(User.id == request.user_id).first()
    user.hashed_password = get_password_hash(payload.new_password)
    request.status = "approved"
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    write_audit(db, "password_reset.approved", "user", str(user.id), admin, {"request_id": request.id})
    db.commit()
    return {"message": "Contraseña restablecida y solicitud aprobada"}


@router.post("/password-reset-requests/{request_id}/reject")
def reject_password_reset(request_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_active_admin)):
    request = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id, PasswordResetRequest.status == "pending").first()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud pendiente no encontrada")
    request.status = "rejected"
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    write_audit(db, "password_reset.rejected", "user", str(request.user_id), admin, {"request_id": request.id})
    db.commit()
    return {"message": "Solicitud rechazada"}
