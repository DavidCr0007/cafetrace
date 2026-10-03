from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class PaymentIntent(BaseModel):
    provider: str = Field("manual", pattern="^(manual|wompi|stripe)$")


class ShipmentUpdate(BaseModel):
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    status: str = Field("pending", pattern="^(pending|packed|in_transit|delivered|exception)$")
    cold_chain_required: bool = False
    last_temperature_c: Optional[Decimal] = None
