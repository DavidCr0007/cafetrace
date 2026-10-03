from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class UserCreate(UserBase):
    password: str = Field(min_length=12)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=12)
    is_active: Optional[bool] = None


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class PasswordResetRequestCreate(BaseModel):
    email: Optional[EmailStr] = None
    access_code: Optional[str] = None


class PasswordResetApproval(BaseModel):
    new_password: str = Field(min_length=12)


class AccessCodeRotateResponse(BaseModel):
    user_id: int
    access_code: str
    expires_in: str = "one use / rotate after delivery"

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
