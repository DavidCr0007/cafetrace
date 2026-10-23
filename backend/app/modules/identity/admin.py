from datetime import datetime, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.identity.models import RefreshSession, User, UserRole, PasswordResetRequest
from app.modules.identity.schemas import AdminUserCreate, AdminUserUpdate, PasswordResetApproval, AccessCodeRotateResponse, User as UserSchema
from app.core.security import get_password_hash, hash_access_code
from app.modules.audit.service import write_audit
from app.modules.identity.permissions import Permission, ROLE_PERMISSIONS, require_permission

router = APIRouter()


@router.get("/access-matrix")
def access_matrix(_: User = Depends(require_permission(Permission.USERS_MANAGE))):
    return {role.value: sorted(permission.value for permission in permissions) for role, permissions in ROLE_PERMISSIONS.items()}


@router.post("/users", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_managed_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission(Permission.USERS_MANAGE)),
):
    email = str(payload.email).strip().lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    user = User(
        email=email,
        full_name=payload.full_name.strip() if payload.full_name else None,
        role=payload.role,
        is_active=payload.is_active,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    try:
        db.flush()
        write_audit(
            db,
            "user.created",
            "user",
            str(user.id),
            admin,
            {"email": user.email, "role": user.role.value, "is_active": user.is_active},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserSchema)
def update_user_access(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.USERS_MANAGE))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    email = str(payload.email).strip().lower() if payload.email else None
    if email and email != user.email.lower() and db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    if user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=422, detail="El administrador actual no puede desactivarse a sí mismo")
    if user.role == UserRole.ADMIN and (payload.role and payload.role != UserRole.ADMIN or payload.is_active is False):
        active_admins = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active.is_(True), User.id != user.id).count()
        if active_admins == 0:
            raise HTTPException(status_code=422, detail="Debe existir al menos un administrador activo")
    before = {"email": user.email, "full_name": user.full_name, "role": user.role.value, "is_active": user.is_active}
    if email is not None:
        user.email = email
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip() or None
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
        if payload.is_active is False:
            db.query(RefreshSession).filter(
                RefreshSession.user_id == user.id,
                RefreshSession.revoked_at.is_(None),
            ).update({"revoked_at": datetime.now(timezone.utc)})
    after = {"email": user.email, "full_name": user.full_name, "role": user.role.value, "is_active": user.is_active}
    write_audit(db, "user.access_updated", "user", str(user.id), admin, {"before": before, "after": after})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    db.refresh(user)
    return user


@router.post("/users/{user_id}/access-code", response_model=AccessCodeRotateResponse)
def rotate_access_code(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.USERS_MANAGE))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    access_code = secrets.token_urlsafe(12)
    user.access_code_hash = hash_access_code(access_code)
    write_audit(db, "user.access_code_rotated", "user", str(user.id), admin)
    db.commit()
    return {"user_id": user.id, "access_code": access_code}


@router.get("/password-reset-requests")
def password_reset_requests(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.PASSWORD_RESET_APPROVE))):
    requests = db.query(PasswordResetRequest).order_by(PasswordResetRequest.requested_at.desc()).limit(100).all()
    return [{"id": item.id, "user_id": item.user_id, "email": item.requested_email, "status": item.status, "expires_at": item.expires_at, "requested_at": item.requested_at} for item in requests]


@router.post("/password-reset-requests/{request_id}/approve")
def approve_password_reset(request_id: int, payload: PasswordResetApproval, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.PASSWORD_RESET_APPROVE))):
    request = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not request or request.status != "pending":
        raise HTTPException(status_code=404, detail="Solicitud pendiente no encontrada")
    if request.expires_at < datetime.now(timezone.utc):
        request.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="La solicitud expiró")
    user = db.query(User).filter(User.id == request.user_id).first()
    user.hashed_password = get_password_hash(payload.new_password)
    db.query(RefreshSession).filter(
        RefreshSession.user_id == user.id,
        RefreshSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.now(timezone.utc)})
    request.status = "approved"
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    write_audit(db, "password_reset.approved", "user", str(user.id), admin, {"request_id": request.id})
    db.commit()
    return {"message": "Contraseña restablecida y solicitud aprobada"}


@router.post("/password-reset-requests/{request_id}/reject")
def reject_password_reset(request_id: int, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.PASSWORD_RESET_APPROVE))):
    request = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id, PasswordResetRequest.status == "pending").first()
    if not request:
        raise HTTPException(status_code=404, detail="Solicitud pendiente no encontrada")
    request.status = "rejected"
    request.reviewed_by = admin.id
    request.reviewed_at = datetime.now(timezone.utc)
    write_audit(db, "password_reset.rejected", "user", str(request.user_id), admin, {"request_id": request.id})
    db.commit()
    return {"message": "Solicitud rechazada"}
