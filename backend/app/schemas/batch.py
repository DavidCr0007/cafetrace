from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class BatchBase(BaseModel):
    status: str = "harvested"
    details: Optional[Dict[str, Any]] = None

class BatchCreate(BatchBase):
    producer_id: int

class BatchUpdate(BaseModel):
    status: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class Batch(BatchBase):
    id: int
    producer_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
