from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Cantidad a comprar")

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemRead(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2)
    customer_email: EmailStr
    customer_phone: str = Field(..., min_length=7)
    shipping_address: str = Field(..., min_length=5)
    city: str = Field(..., min_length=2)
    department: str = "Huila"
    payment_method: str = Field("contra_entrega", pattern="^(contra_entrega|transferencia)$")
    notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|processing|shipped|delivered|cancelled)$")


class OrderRead(BaseModel):
    id: int
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: str
    city: str
    department: str
    total_amount: Decimal
    status: str
    payment_method: str
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)
