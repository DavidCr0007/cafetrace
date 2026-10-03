from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, Dict, Any

class TraceabilityRecordBase(BaseModel):
    record_type: str = Field(..., pattern="^(iot|manual|blockchain_event|weather_forecast)$")
    data: Dict[str, Any]
    blockchain_hash: Optional[str] = None

class TraceabilityRecordCreate(TraceabilityRecordBase):
    batch_id: int

class TraceabilityRecord(TraceabilityRecordBase):
    id: int
    batch_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class IoTIngest(BaseModel):
    batch_id: int
    sensor_id: str = Field(..., min_length=2, max_length=100)
    temperature: Optional[float] = None
    humidity: Optional[float] = Field(default=None, ge=0, le=100)
    location: Optional[Dict[str, Any]] = None
    measured_at: datetime
    payload: Dict[str, Any] = Field(default_factory=dict)


class IoTDeviceCreate(BaseModel):
    device_id: str = Field(..., min_length=2, max_length=100)
    batch_id: Optional[int] = None
    token: str = Field(..., min_length=24, max_length=256)


class BlockchainVerification(BaseModel):
    batch_id: int
    configured: bool
    verified: bool
    data_hash: Optional[str] = None
    on_chain_hash: Optional[str] = None
    transaction_hash: Optional[str] = None
    status: str
