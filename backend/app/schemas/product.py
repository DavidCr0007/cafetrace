from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    stock: int = Field(0, ge=0)
    attributes: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    batch_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)
    attributes: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class Product(ProductBase):
    id: int
    batch_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
