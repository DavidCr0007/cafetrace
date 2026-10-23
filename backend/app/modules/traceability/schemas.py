from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Annotated, Literal, Optional, Dict, Any, Union

from app.modules.traceability.attributes import CoffeeAttributes, MeatAttributes
from app.modules.traceability.models import ProductType

BATCH_STATUS_PATTERN = "^(harvested|processing|ready|shipped)$"


class BatchCreateBase(BaseModel):
    producer_id: int
    seller_id: Optional[int] = None
    status: str = Field("harvested", pattern=BATCH_STATUS_PATTERN)


class CoffeeBatchCreate(BatchCreateBase):
    product_type: Literal["coffee"]
    details: CoffeeAttributes


class MeatBatchCreate(BatchCreateBase):
    product_type: Literal["meat"]
    details: MeatAttributes


# El discriminador selecciona el esquema de atributos y lo documenta como oneOf en OpenAPI.
BatchCreate = Annotated[Union[CoffeeBatchCreate, MeatBatchCreate], Field(discriminator="product_type")]


class BatchUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern=BATCH_STATUS_PATTERN)
    # Reemplazo completo; se valida contra el product_type inmutable del lote.
    details: Optional[Dict[str, Any]] = None
    seller_id: Optional[int] = None


class Batch(BaseModel):
    id: int
    producer_id: int
    seller_id: Optional[int] = None
    product_type: ProductType
    status: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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
