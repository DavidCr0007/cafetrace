from datetime import datetime, timedelta, timezone
import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_family_id,
    create_refresh_token,
    get_password_hash,
    hash_access_code,
    hash_refresh_token,
    verify_password,
)
from app.core.rate_limit import clear_auth_rate_limit, enforce_auth_rate_limit
from app.models.user import RefreshSession, User as UserModel, UserRole
from app.schemas.token import Token
from app.schemas.user import User, UserCreate, PasswordResetRequestCreate
from app.models.user import PasswordResetRequest
from app.services.audit import write_audit

router = APIRouter()

class LoginJSON(BaseModel):
    email: EmailStr
    password: str


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=f"{settings.API_V1_STR}/auth",
    )


def _issue_refresh_session(db: Session, user: UserModel, family_id: str | None = None) -> str:
    raw_token = create_refresh_token()
    db.add(RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_token),
        family_id=family_id or create_refresh_family_id(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    return raw_token


def _complete_login(db: Session, response: Response, user: UserModel, method: str) -> dict[str, str]:
    raw_refresh = _issue_refresh_session(db, user)
    write_audit(db, "auth.login", "user", str(user.id), user, {"method": method})
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests (used by Swagger UI).
    Note: form_data.username contains the email.
    """
    enforce_auth_rate_limit(request, "oauth_login")
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    clear_auth_rate_limit(request, "oauth_login")
    return _complete_login(db, response, user, "oauth2")

@router.post("/login", response_model=Token)
def login_json(
    login_data: LoginJSON,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
) -> Any:
    """
    JSON-based login endpoint for web and mobile frontends.
    """
    enforce_auth_rate_limit(request, "json_login")
    user = db.query(UserModel).filter(UserModel.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    clear_auth_rate_limit(request, "json_login")
    return _complete_login(db, response, user, "json")


@router.post("/refresh", response_model=Token)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)) -> Any:
    raw_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=401, detail="Refresh token requerido")
    token_hash = hash_refresh_token(raw_token)
    session = db.query(RefreshSession).filter(RefreshSession.token_hash == token_hash).first()
    now = datetime.now(timezone.utc)
    if not session:
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    if session.revoked_at is not None:
        db.query(RefreshSession).filter(
            RefreshSession.family_id == session.family_id,
            RefreshSession.revoked_at.is_(None),
        ).update({"revoked_at": now})
        write_audit(db, "auth.refresh_reuse_detected", "user", str(session.user_id), metadata={"family_id": session.family_id})
        db.commit()
        response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=f"{settings.API_V1_STR}/auth")
        raise HTTPException(status_code=401, detail="Reutilización de refresh token detectada")
    if session.expires_at <= now:
        session.revoked_at = now
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expirado")
    user = db.query(UserModel).filter(UserModel.id == session.user_id, UserModel.is_active.is_(True)).first()
    if not user:
        session.revoked_at = now
        db.commit()
        raise HTTPException(status_code=401, detail="Cuenta no disponible")
    replacement = _issue_refresh_session(db, user, session.family_id)
    session.revoked_at = now
    session.last_used_at = now
    session.replaced_by_hash = hash_refresh_token(replacement)
    write_audit(db, "auth.refresh_rotated", "user", str(user.id), user)
    db.commit()
    _set_refresh_cookie(response, replacement)
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    raw_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if raw_token:
        session = db.query(RefreshSession).filter(RefreshSession.token_hash == hash_refresh_token(raw_token)).first()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            write_audit(db, "auth.logout", "user", str(session.user_id), metadata={"family_id": session.family_id})
            db.commit()
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=f"{settings.API_V1_STR}/auth")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user in the platform.
    """
    user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists in the system."
        )
    db_user = UserModel(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        # El registro público nunca puede crear administradores o productores.
        role=UserRole.BUYER,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/password-reset/request")
def request_password_reset(
    request: PasswordResetRequestCreate,
    http_request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Creates a pending request; response does not reveal whether an account exists."""
    enforce_auth_rate_limit(http_request, "password_reset")
    if not request.email and not request.access_code:
        raise HTTPException(status_code=422, detail="Debe enviar correo o código de acceso")
    user = None
    if request.email:
        user = db.query(UserModel).filter(UserModel.email == request.email).first()
    elif request.access_code:
        user = db.query(UserModel).filter(UserModel.access_code_hash == hash_access_code(request.access_code)).first()
    if user and user.is_active:
        now = datetime.now(timezone.utc)
        pending = db.query(PasswordResetRequest).filter(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status == "pending",
            PasswordResetRequest.expires_at > now,
        ).first()
        if not pending:
            pending = PasswordResetRequest(
                user_id=user.id,
                requested_email=user.email,
                status="pending",
                expires_at=now + timedelta(minutes=30),
            )
            db.add(pending)
            write_audit(db, "password_reset.requested", "user", str(user.id), metadata={"channel": "email_or_access_code"})
            db.commit()
    return {"message": "Si los datos corresponden a una cuenta activa, la solicitud quedó pendiente de confirmación administrativa."}
