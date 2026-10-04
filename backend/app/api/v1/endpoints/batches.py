from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_producer, get_current_user
from app.core.permissions import Permission, has_permission
from app.models.user import User as UserModel
from app.models.batch import Batch as BatchModel
from app.models.product import Product as ProductModel
from app.models.traceability import TraceabilityRecord as TraceabilityModel
from app.schemas.batch import Batch, BatchCreate
from app.schemas.traceability import TraceabilityRecord, TraceabilityRecordCreate
from app.core.blockchain import compute_batch_data_hash, notarize_batch, verify_batch
from app.models.traceability import BlockchainNotarization
from app.services.audit import write_audit

router = APIRouter()


def _internal_batch_access(batch: BatchModel, current_user: UserModel) -> None:
    """Protege telemetría y metadatos operativos contra IDOR entre productores."""
    if current_user.role.value == "admin":
        return
    if current_user.role.value == "auditor" and has_permission(current_user, Permission.TRACEABILITY_READ):
        return
    if current_user.role.value == "producer" and batch.producer_id == current_user.id:
        return
    # 404 evita revelar si un lote ajeno existe.
    raise HTTPException(status_code=404, detail="Lote no encontrado")

@router.post("", response_model=Batch, include_in_schema=False)
@router.post("/", response_model=Batch)
def create_batch(batch: BatchCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_producer)):
    if current_user.role.value != "admin" and batch.producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="El productor solo puede crear sus propios lotes")
    db_batch = BatchModel(**batch.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("", response_model=List[Batch], include_in_schema=False)
@router.get("/", response_model=List[Batch])
def read_batches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if current_user.role.value in {"admin", "auditor"}:
        batches = db.query(BatchModel).offset(skip).limit(limit).all()
    elif current_user.role.value == "producer":
        batches = db.query(BatchModel).filter(BatchModel.producer_id == current_user.id).offset(skip).limit(limit).all()
    else:
        raise HTTPException(status_code=403, detail="No autorizado para consultar lotes operativos")
    return batches

@router.get("/{batch_id}", response_model=Batch)
def read_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    _internal_batch_access(batch, current_user)
    return batch

# Traceability endpoints related to batches
@router.post("/{batch_id}/records", response_model=TraceabilityRecord)
def create_batch_record(batch_id: int, record: TraceabilityRecordCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_producer)):
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if record.batch_id != batch_id:
        raise HTTPException(status_code=422, detail="El batch_id del registro no coincide con la ruta")
    if current_user.role.value != "admin" and batch.producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este lote")
    db_record = TraceabilityModel(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@router.get("/{batch_id}/records", response_model=List[TraceabilityRecord])
def read_batch_records(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    _internal_batch_access(batch, current_user)
    records = db.query(TraceabilityModel).filter(TraceabilityModel.batch_id == batch_id).all()
    return records


@router.post("/{batch_id}/notarize")
def notarize(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_producer),
):
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role.value != "admin" and batch.producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este lote")
    existing = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="El lote ya tiene una notarización persistida")
    products = db.query(ProductModel).filter(ProductModel.batch_id == batch_id).all()
    attrs = products[0].attributes if products and products[0].attributes else {}
    result = notarize_batch(batch_id, batch.details or {}, attrs.get("sca_score"))
    if result["status"] != "confirmed":
        raise HTTPException(status_code=502, detail="La transacción blockchain fue minada con estado fallido")
    db.add(BlockchainNotarization(
        batch_id=batch_id,
        data_hash=result["data_hash"],
        transaction_hash=result["transaction_hash"],
        block_number=result["block_number"],
        chain_id=result["chain_id"],
        network=result["network"],
        contract_address=result["contract_address"],
        status=result["status"],
    ))
    db.add(TraceabilityModel(batch_id=batch_id, record_type="blockchain_event", data=result, blockchain_hash=result["transaction_hash"]))
    write_audit(db, "blockchain.batch_notarized", "batch", str(batch_id), current_user, {"transaction_hash": result["transaction_hash"]})
    db.commit()
    return result


@router.get("/{batch_id}/verify")
def verify(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    products = db.query(ProductModel).filter(ProductModel.batch_id == batch_id).all()
    attrs = products[0].attributes if products and products[0].attributes else {}
    record = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch_id).first()
    if not record:
        return {"batch_id": batch_id, "configured": False, "verified": False, "status": "not_notarized"}
    result = verify_batch(batch_id, compute_batch_data_hash(batch_id, batch.details or {}, attrs.get("sca_score")))
    return {"batch_id": batch_id, "configured": True, "verified": result["verified"], "data_hash": record.data_hash, "on_chain_hash": result["on_chain_hash"], "transaction_hash": record.transaction_hash, "status": "verified" if result["verified"] else "mismatch"}

@router.get("/{batch_id}/timeline")
def get_batch_timeline(batch_id: int, db: Session = Depends(get_db)):
    """
    Retorna la línea de tiempo completa y enriquecida del lote con:
    - Terroir y Finca (GPS, altitud, productor)
    - Proceso agrícola / manufactura
    - Telemetría IoT en vivo
    - Evaluación de Calidad (SCA score o INVIMA)
    - Notarización inmutable en Polygon Blockchain
    """
    batch = db.query(BatchModel).filter(BatchModel.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    records = (
        db.query(TraceabilityModel)
        .filter(TraceabilityModel.batch_id == batch_id)
        .order_by(TraceabilityModel.timestamp.asc())
        .all()
    )

    products = db.query(ProductModel).filter(ProductModel.batch_id == batch_id).all()
    primary_product = products[0] if products else None
    product_attrs = primary_product.attributes if primary_product and primary_product.attributes else {}

    details = batch.details or {}
    sca_score = product_attrs.get("sca_score")

    stored_notarization = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch.id).first()
    notarization = {
        "network": stored_notarization.network if stored_notarization else None,
        "chain_id": stored_notarization.chain_id if stored_notarization else None,
        "contract_address": stored_notarization.contract_address if stored_notarization else None,
        "data_hash": stored_notarization.data_hash if stored_notarization else None,
        "transaction_hash": stored_notarization.transaction_hash if stored_notarization else None,
        "status": stored_notarization.status if stored_notarization else "not_notarized",
        "block_number": stored_notarization.block_number if stored_notarization else None,
        "is_immutable": bool(stored_notarization and stored_notarization.status == "confirmed"),
    }

    is_coffee = product_attrs.get("category") == "coffee" or sca_score is not None

    # Construir etapas estructuradas
    stages = [
        {
            "id": "stage_terroir",
            "title": "Terroir y Origen Certificado",
            "subtitle": details.get("farm") or details.get("facility") or "Región Productora",
            "location": details.get("origin", "Huila, Colombia"),
            "altitude": details.get("altitude"),
            "variety": details.get("variety") or "Selección Campesina",
            "producer_name": batch.producer.full_name if batch.producer else "Cooperativa Regional",
            "coordinates": details.get("location") or {"lat": 1.8543, "lng": -76.0512},
            "status": "completed",
            "timestamp": batch.created_at.isoformat() if batch.created_at else None
        },
        {
            "id": "stage_process",
            "title": "Cosecha y Proceso de Beneficio" if is_coffee else "Elaboración y Curado",
            "subtitle": details.get("process") or "Procesamiento Tradicional Huilense",
            "harvest_date": details.get("harvest_date") or "2024-08-15",
            "method": details.get("process") or details.get("sanitary_license") or "Estándar Huila",
            "status": "completed",
            "timestamp": details.get("harvest_date")
        },
        {
            "id": "stage_iot",
            "title": "Telemetría IoT en Tiempo Real",
            "subtitle": "Monitoreo con sondas térmicas e higrómetros LoRa/ESP32",
            "records": [
                {
                    "id": r.id,
                    "type": r.record_type,
                    "sensor_id": r.data.get("sensor_id", "ESP32-NODE"),
                    "temperature": r.data.get("temperature"),
                    "humidity": r.data.get("humidity"),
                    "location": r.data.get("location"),
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None
                }
                for r in records if r.record_type == "iot"
            ],
            "status": "completed"
        },
        {
            "id": "stage_quality",
            "title": "Certificación de Calidad y Cata" if is_coffee else "Control de Cadena de Frío e Inocuidad",
            "sca_score": sca_score,
            "cup_profile": product_attrs.get("cup_profile") or ["Balanceado", "Aroma frutal"],
            "temperature_control": product_attrs.get("temperature_control"),
            "sanitary_registry": product_attrs.get("sanitary_registry") or details.get("sanitary_license"),
            "status": "completed"
        },
        {
            "id": "stage_blockchain",
            "title": "Registro Inmutable en Polygon PoS",
            "subtitle": "Criptografía verificable y sin intermediarios",
            "notarization": notarization,
            "status": "verified" if stored_notarization else "pending_notarization"
        }
    ]

    return {
        "batch_id": batch.id,
        "batch_status": batch.status,
        "product": {
            "id": primary_product.id if primary_product else None,
            "name": primary_product.name if primary_product else f"Lote #{batch.id}",
            "category": product_attrs.get("category", "coffee" if is_coffee else "cured_meats"),
            "price": primary_product.price if primary_product else 0,
            "image_url": primary_product.image_url if primary_product else None
        },
        "details": details,
        "stages": stages,
        "notarization": notarization
    }
