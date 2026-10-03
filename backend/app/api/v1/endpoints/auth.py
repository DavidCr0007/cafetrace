from datetime import datetime, timedelta, timezone
import secrets
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash, hash_access_code
from app.models.user import User as UserModel, UserRole
from app.schemas.token import Token
from app.schemas.user import User, UserCreate, PasswordResetRequestCreate
from app.models.user import PasswordResetRequest
from app.services.audit import write_audit

router = APIRouter()

class LoginJSON(BaseModel):
    email: EmailStr
    password: str

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests (used by Swagger UI).
    Note: form_data.username contains the email.
    """
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
    write_audit(db, "auth.login", "user", str(user.id), user, {"method": "oauth2"})
    db.commit()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/login", response_model=Token)
def login_json(
    login_data: LoginJSON,
    db: Session = Depends(get_db)
) -> Any:
    """
    JSON-based login endpoint for web and mobile frontends.
    """
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
    write_audit(db, "auth.login", "user", str(user.id), user, {"method": "json"})
    db.commit()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

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
        role=UserRole.CUSTOMER,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/password-reset/request")
def request_password_reset(
    request: PasswordResetRequestCreate,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Creates a pending request; response does not reveal whether an account exists."""
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
