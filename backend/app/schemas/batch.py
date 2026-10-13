from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class BatchBase(BaseModel):
    status: str = "harvested"
    details: Optional[Dict[str, Any]] = None

class BatchCreate(BatchBase):
    producer_id: int
    seller_id: Optional[int] = None

class BatchUpdate(BaseModel):
    status: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    seller_id: Optional[int] = None

class Batch(BatchBase):
    id: int
    producer_id: int
    seller_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
