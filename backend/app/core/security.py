from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from passlib.context import CryptContext
from app.core.config import settings

import bcrypt
import hashlib
import hmac

# Fix for passlib expecting bcrypt.__about__.__version__
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": bcrypt.__version__})

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_access_code(access_code: str) -> str:
    """Deterministic keyed digest for lookup; never stores the access code itself."""
    return hmac.new(settings.SECRET_KEY.encode(), access_code.encode(), hashlib.sha256).hexdigest()


def verify_access_code(access_code: str, access_code_hash: str | None) -> bool:
    if not access_code_hash:
        return False
    return hmac.compare_digest(hash_access_code(access_code), access_code_hash)

def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
