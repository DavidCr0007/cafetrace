from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.orders.service import get_scoped_order
from app.modules.logistics.models import Shipment
from app.modules.identity.models import User
from app.modules.logistics.schemas import ShipmentUpdate
from app.modules.audit.service import write_audit
from app.modules.identity.permissions import Permission, require_permission

router = APIRouter()


@router.put("/orders/{order_id}/shipment")
def update_shipment(order_id: int, payload: ShipmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission(Permission.LOGISTICS_WRITE))):
    get_scoped_order(db, order_id, current_user)
    shipment = db.query(Shipment).filter(Shipment.order_id == order_id).first()
    if not shipment:
        shipment = Shipment(order_id=order_id)
        db.add(shipment)
    for key, value in payload.model_dump().items():
        setattr(shipment, key, str(value) if key == "cold_chain_required" else value)
    write_audit(db, "logistics.shipment_updated", "order", str(order_id), current_user, {"status": payload.status, "cold_chain_required": payload.cold_chain_required})
    db.commit()
    db.refresh(shipment)
    return shipment
