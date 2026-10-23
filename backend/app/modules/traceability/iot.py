import hashlib
import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.modules.traceability.models import Batch
from app.modules.traceability.models import IoTDevice, TraceabilityRecord
from app.modules.identity.models import User
from app.modules.identity.permissions import Permission, has_permission, require_permission
from app.modules.traceability.access import get_writable_batch
from app.modules.traceability.schemas import IoTDeviceCreate, IoTIngest
from app.modules.audit.service import write_audit

router = APIRouter()


@router.get("/devices")
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TRACEABILITY_WRITE)),
):
    query = db.query(IoTDevice)
    if not has_permission(current_user, Permission.TRACEABILITY_MANAGE_ALL):
        query = query.join(Batch).filter(Batch.producer_id == current_user.id)
    return [
        {"device_id": item.device_id, "batch_id": item.batch_id, "is_active": item.is_active, "last_seen_at": item.last_seen_at}
        for item in query.order_by(IoTDevice.created_at.desc()).all()
    ]


@router.post("/devices")
def register_device(
    payload: IoTDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.TRACEABILITY_WRITE)),
):
    if db.query(IoTDevice).filter(IoTDevice.device_id == payload.device_id).first():
        raise HTTPException(status_code=409, detail="El dispositivo ya existe")
    if payload.batch_id:
        get_writable_batch(db, payload.batch_id, current_user)
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
    response: Response,
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
    external_id = f"{x_iot_device}:{payload.measured_at.isoformat()}"
    existing = db.query(TraceabilityRecord).filter(TraceabilityRecord.external_id == external_id).first()
    if existing:
        response.status_code = 200
        return {"id": existing.id, "batch_id": existing.batch_id, "record_type": existing.record_type, "timestamp": existing.timestamp}
    record = TraceabilityRecord(batch_id=payload.batch_id, record_type="iot", data=data, external_id=external_id)
    db.add(record)
    device.last_seen_at = now
    write_audit(db, "iot.measurement_ingested", "batch", str(payload.batch_id), metadata={"device_id": x_iot_device, "sensor_id": payload.sensor_id})
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(TraceabilityRecord).filter(TraceabilityRecord.external_id == external_id).one()
        response.status_code = 200
        return {"id": existing.id, "batch_id": existing.batch_id, "record_type": existing.record_type, "timestamp": existing.timestamp}
    db.refresh(record)
    return {"id": record.id, "batch_id": record.batch_id, "record_type": record.record_type, "timestamp": record.timestamp}
