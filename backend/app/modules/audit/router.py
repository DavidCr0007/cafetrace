from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.audit.models import AuditEvent
from app.modules.blockchain.models import BlockchainNotarization
from app.modules.catalog.models import Product
from app.modules.identity.models import User
from app.modules.identity.permissions import Permission, require_permission
from app.modules.orders.models import Order
from app.modules.traceability.models import Batch, IoTDevice

# Vistas de supervisión de plataforma, montadas bajo /admin por compatibilidad de rutas.
router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.DASHBOARD_SUMMARY_READ))):
    return {
        "users": db.query(User).count(),
        "batches": db.query(Batch).count(),
        "products": db.query(Product).count(),
        "orders": db.query(Order).count(),
        "iot_devices": db.query(IoTDevice).count(),
        "notarized_batches": db.query(BlockchainNotarization).filter(BlockchainNotarization.status == "confirmed").count(),
        "audit_events": db.query(AuditEvent).count(),
    }


@router.get("/audit-events")
def audit_events(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.AUDIT_READ)),
):
    events = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(limit).all()
    return [{"id": e.id, "action": e.action, "resource_type": e.resource_type, "resource_id": e.resource_id, "metadata": e.metadata_json, "actor_user_id": e.actor_user_id, "timestamp": e.timestamp} for e in events]
