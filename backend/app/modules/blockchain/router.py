from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.audit.service import write_audit
from app.modules.blockchain.models import BlockchainNotarization
from app.modules.blockchain.schemas import BlockchainVerification
from app.modules.blockchain.service import compute_batch_data_hash, notarize_batch, verify_batch
from app.modules.identity.models import User
from app.modules.identity.permissions import Permission, require_permission
from app.modules.traceability.access import get_writable_batch
from app.modules.traceability.models import Batch, TraceabilityRecord

# Montado bajo /batches: la notarización es una operación sobre el lote.
router = APIRouter()


@router.post("/{batch_id}/notarize")
def notarize(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.BLOCKCHAIN_NOTARIZE)),
):
    batch = get_writable_batch(db, batch_id, current_user)
    existing = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="El lote ya tiene una notarización persistida")
    result = notarize_batch(batch_id, batch.product_type, batch.details or {})
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
    db.add(TraceabilityRecord(batch_id=batch_id, record_type="blockchain_event", data=result, blockchain_hash=result["transaction_hash"]))
    write_audit(db, "blockchain.batch_notarized", "batch", str(batch_id), current_user, {"transaction_hash": result["transaction_hash"]})
    db.commit()
    return result


@router.get("/{batch_id}/verify", response_model=BlockchainVerification)
def verify(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    record = db.query(BlockchainNotarization).filter(BlockchainNotarization.batch_id == batch_id).first()
    if not record:
        return {"batch_id": batch_id, "configured": False, "verified": False, "status": "not_notarized"}
    result = verify_batch(batch_id, compute_batch_data_hash(batch_id, batch.product_type, batch.details or {}))
    return {"batch_id": batch_id, "configured": True, "verified": result["verified"], "data_hash": record.data_hash, "on_chain_hash": result["on_chain_hash"], "transaction_hash": record.transaction_hash, "status": "verified" if result["verified"] else "mismatch"}
