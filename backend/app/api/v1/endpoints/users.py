from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User as UserModel
from app.schemas.user import User, UserUpdate
from app.core.permissions import Permission, require_permission, ROLE_PERMISSIONS
from app.services.audit import write_audit

router = APIRouter()

@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Get current logged in user.
    """
    return current_user

@router.put("/me", response_model=User)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Update own user profile.
    """
    if user_in.email is not None and user_in.email != current_user.email:
        existing_user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user"
            )
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name

    if user_in.password is not None and user_in.password.strip():
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    write_audit(db, "user.profile_updated", "user", str(current_user.id), current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("", response_model=List[User], include_in_schema=False)
@router.get("/", response_model=List[User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_permission(Permission.USERS_READ))
) -> Any:
    """
    Retrieve users list (Admin only).
    """
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users


@router.get("/me/access")
def read_my_access(current_user: UserModel = Depends(get_current_user)) -> Any:
    return {
        "user_id": current_user.id,
        "role": current_user.role.value,
        "modules": sorted(permission.value for permission in ROLE_PERMISSIONS.get(current_user.role, set())),
    }

@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Get a specific user by id.
    """
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return user
