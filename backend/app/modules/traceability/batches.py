from fastapi import APIRouter, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import List
from app.core.config import settings
from app.core.database import get_db
from app.modules.identity.models import User as UserModel, UserRole
from app.modules.identity.permissions import Permission, has_permission, require_permission
from app.modules.traceability.models import Batch as BatchModel, ProductType, TraceabilityRecord as TraceabilityModel
from app.modules.catalog.models import Product as ProductModel
from app.modules.blockchain.models import BlockchainNotarization
from app.modules.traceability.access import (
    get_readable_batch,
    get_writable_batch,
    scope_batches,
    validate_commercial_owner,
)
from app.modules.traceability.attributes import normalize_attributes, validate_attributes
from app.modules.traceability.schemas import Batch, BatchCreate, BatchUpdate, TraceabilityRecord, TraceabilityRecordCreate
from app.modules.audit.service import write_audit

router = APIRouter()


def _is_notarized(db: Session, batch_id: int) -> bool:
    return db.query(BlockchainNotarization.id).filter(BlockchainNotarization.batch_id == batch_id).first() is not None


@router.post("", response_model=Batch, include_in_schema=False)
@router.post("/", response_model=Batch)
def create_batch(batch: BatchCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_WRITE))):
    if batch.producer_id != current_user.id and not has_permission(current_user, Permission.TRACEABILITY_MANAGE_ALL):
        raise HTTPException(status_code=403, detail="El productor solo puede crear sus propios lotes")
    producer = db.query(UserModel).filter(
        UserModel.id == batch.producer_id,
        UserModel.role == UserRole.PRODUCER,
        UserModel.is_active.is_(True),
    ).first()
    if not producer:
        raise HTTPException(status_code=422, detail="El lote debe pertenecer a un productor activo")
    if batch.seller_id:
        validate_commercial_owner(db, batch.seller_id, batch.producer_id)
    db_batch = BatchModel(
        producer_id=batch.producer_id,
        seller_id=batch.seller_id,
        product_type=batch.product_type,
        status=batch.status,
        details=normalize_attributes(batch.details),
    )
    db.add(db_batch)
    db.flush()
    write_audit(db, "traceability.batch_created", "batch", str(db_batch.id), current_user, {"producer_id": db_batch.producer_id, "seller_id": db_batch.seller_id, "product_type": db_batch.product_type})
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("", response_model=List[Batch], include_in_schema=False)
@router.get("/", response_model=List[Batch])
def read_batches(
    skip: int = 0,
    limit: int = 100,
    product_type: ProductType | None = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_READ)),
):
    query = scope_batches(db.query(BatchModel), current_user)
    if product_type:
        query = query.filter(BatchModel.product_type == product_type.value)
    return query.order_by(BatchModel.id).offset(skip).limit(limit).all()

@router.get("/{batch_id}", response_model=Batch)
def read_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_READ)),
):
    return get_readable_batch(db, batch_id, current_user)


@router.patch("/{batch_id}", response_model=Batch)
def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_WRITE)),
):
    batch = get_writable_batch(db, batch_id, current_user)
    changes = payload.model_dump(exclude_unset=True)
    before = {"status": batch.status, "seller_id": batch.seller_id}
    if "details" in changes:
        if changes["details"] is None:
            raise HTTPException(status_code=422, detail="Los atributos del lote no pueden quedar vacíos")
        # Lo notarizado es inmutable: alterar los atributos invalidaría el hash on-chain.
        if _is_notarized(db, batch.id):
            raise HTTPException(status_code=409, detail="El lote ya fue notarizado; sus atributos no pueden modificarse")
        try:
            changes["details"] = validate_attributes(batch.product_type, changes["details"])
        except ValidationError as exc:
            raise RequestValidationError([{**error, "loc": ("body", "details", *error["loc"])} for error in exc.errors(include_url=False)])
        before["details"] = batch.details
    if changes.get("seller_id") is not None:
        validate_commercial_owner(db, changes["seller_id"], batch.producer_id)
    for key, value in changes.items():
        setattr(batch, key, value)
    write_audit(db, "traceability.batch_updated", "batch", str(batch.id), current_user, {"before": before})
    db.commit()
    db.refresh(batch)
    return batch

# Traceability endpoints related to batches
@router.post("/{batch_id}/records", response_model=TraceabilityRecord)
def create_batch_record(batch_id: int, record: TraceabilityRecordCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_WRITE))):
    if record.batch_id != batch_id:
        raise HTTPException(status_code=422, detail="El batch_id del registro no coincide con la ruta")
    get_writable_batch(db, batch_id, current_user)
    db_record = TraceabilityModel(**record.model_dump())
    db.add(db_record)
    db.flush()
    write_audit(db, "traceability.record_created", "batch", str(batch_id), current_user, {"record_id": db_record.id, "record_type": db_record.record_type})
    db.commit()
    db.refresh(db_record)
    return db_record

@router.get("/{batch_id}/records", response_model=List[TraceabilityRecord])
def read_batch_records(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.TRACEABILITY_READ)),
):
    get_readable_batch(db, batch_id, current_user)
    return db.query(TraceabilityModel).filter(TraceabilityModel.batch_id == batch_id).order_by(TraceabilityModel.timestamp.asc()).all()


# Atributos aptos para el pasaporte público; el resto de `details` no se expone sin autenticación.
PUBLIC_ORIGIN_FIELDS = ("farm", "vereda", "municipality", "department", "coordinates", "certifications")
PUBLIC_ATTRIBUTE_FIELDS = {
    ProductType.COFFEE: (
        "altitude_masl", "variety", "harvest_started_on", "harvest_ended_on", "process", "drying_method",
        "drying_days", "fermentation_hours", "moisture_pct", "roast_level", "roast_date", "sca_score", "cup_notes",
    ),
    ProductType.MEAT: (
        "species", "breed", "animal_age_months", "feeding_type", "refrigeration_type", "storage_temp_min_c",
        "storage_temp_max_c", "slaughter_date", "slaughterhouse", "sanitary_registry", "withdrawal_period_respected", "cut",
    ),
}


@router.get("/{batch_id}/timeline")
def get_batch_timeline(batch_id: int, db: Session = Depends(get_db)):
    """
    Pasaporte público del lote: origen, atributos tipados por clase de producto,
    telemetría IoT y estado de notarización en Polygon.
    """
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")

    product_type = ProductType(batch.product_type)
    details = batch.details or {}
    iot_records = (
        db.query(TraceabilityModel)
        .filter(TraceabilityModel.batch_id == batch_id, TraceabilityModel.record_type == "iot")
        .order_by(TraceabilityModel.timestamp.asc())
        .all()
    )
    primary_product = db.query(ProductModel).filter(ProductModel.batch_id == batch_id).order_by(ProductModel.id).first()
    stored = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch.id).first()

    origin = {key: details[key] for key in PUBLIC_ORIGIN_FIELDS if key in details}
    origin.setdefault("municipality", "Icononzo")
    origin.setdefault("department", "Tolima")
    origin.setdefault("coordinates", {"lat": settings.WEATHER_LATITUDE, "lng": settings.WEATHER_LONGITUDE})

    return {
        "batch_id": batch.id,
        "batch_status": batch.status,
        "product_type": product_type.value,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "producer_name": batch.producer.full_name if batch.producer else None,
        "product": {
            "id": primary_product.id if primary_product else None,
            "name": primary_product.name if primary_product else f"Lote #{batch.id}",
            "price": primary_product.price if primary_product else None,
            "image_url": primary_product.image_url if primary_product else None,
        },
        "origin": origin,
        "attributes": {key: details[key] for key in PUBLIC_ATTRIBUTE_FIELDS[product_type] if key in details},
        "iot_records": [
            {
                "id": r.id,
                "sensor_id": r.data.get("sensor_id"),
                "temperature": r.data.get("temperature"),
                "humidity": r.data.get("humidity"),
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in iot_records
        ],
        "notarization": {
            "network": stored.network if stored else None,
            "chain_id": stored.chain_id if stored else None,
            "contract_address": stored.contract_address if stored else None,
            "data_hash": stored.data_hash if stored else None,
            "transaction_hash": stored.transaction_hash if stored else None,
            "block_number": stored.block_number if stored else None,
            "status": stored.status if stored else "not_notarized",
            "is_immutable": bool(stored and stored.status == "confirmed"),
        },
    }
