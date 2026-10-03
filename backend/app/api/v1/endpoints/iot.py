import hashlib
import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_producer
from app.core.database import get_db
from app.core.config import settings
from app.models.batch import Batch
from app.models.traceability import IoTDevice, TraceabilityRecord
from app.models.user import User
from app.schemas.traceability import IoTDeviceCreate, IoTIngest
from app.services.audit import write_audit

router = APIRouter()


@router.post("/devices")
def register_device(
    payload: IoTDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_producer),
):
    if db.query(IoTDevice).filter(IoTDevice.device_id == payload.device_id).first():
        raise HTTPException(status_code=409, detail="El dispositivo ya existe")
    if payload.batch_id:
        batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Lote no encontrado")
        if current_user.role.value != "admin" and batch.producer_id != current_user.id:
            raise HTTPException(status_code=403, detail="No autorizado para este lote")
    device = IoTDevice(
        device_id=payload.device_id,
        batch_id=payload.batch_id,
        secret_hash=hashlib.sha256(payload.token.encode()).hexdigest(),
    )
    db.add(device)
    write_audit(db, "iot.device_registered", "iot_device", payload.device_id, current_user)
    db.commit()
    return {"device_id": device.device_id, "batch_id": device.batch_id, "status": "active"}


@router.post("/ingest", status_code=201)
def ingest(
    payload: IoTIngest,
    x_iot_device: str = Header(...),
    x_iot_token: str = Header(...),
    db: Session = Depends(get_db),
):
    device = db.query(IoTDevice).filter(IoTDevice.device_id == x_iot_device, IoTDevice.is_active.is_(True)).first()
    expected = hashlib.sha256(x_iot_token.encode()).hexdigest()
    if not device or not hmac.compare_digest(device.secret_hash, expected):
        raise HTTPException(status_code=401, detail="Credenciales IoT inválidas")
    if device.batch_id and device.batch_id != payload.batch_id:
        raise HTTPException(status_code=403, detail="El dispositivo no está asignado a este lote")
    now = datetime.now(timezone.utc)
    measured = payload.measured_at
    if measured.tzinfo is None:
        measured = measured.replace(tzinfo=timezone.utc)
    if abs((now - measured).total_seconds()) > settings.IOT_MAX_CLOCK_SKEW_SECONDS:
        raise HTTPException(status_code=422, detail="La medición está fuera de la ventana temporal permitida")
    data = {"sensor_id": payload.sensor_id, "temperature": payload.temperature, "humidity": payload.humidity, "location": payload.location, **payload.payload}
    record = TraceabilityRecord(batch_id=payload.batch_id, record_type="iot", data=data, external_id=f"{x_iot_device}:{payload.measured_at.isoformat()}")
    db.add(record)
    device.last_seen_at = now
    write_audit(db, "iot.measurement_ingested", "batch", str(payload.batch_id), metadata={"device_id": x_iot_device, "sensor_id": payload.sensor_id})
    db.commit()
    db.refresh(record)
    return {"id": record.id, "batch_id": record.batch_id, "record_type": record.record_type, "timestamp": record.timestamp}
