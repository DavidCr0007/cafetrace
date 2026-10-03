from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order
from app.models.operations import Payment, Shipment
from app.models.user import User
from app.schemas.operations import PaymentIntent, ShipmentUpdate
from app.services.audit import write_audit
from app.core.permissions import Permission, require_permission

router = APIRouter()


@router.post("/orders/{order_id}/payment-intents")
def create_payment_intent(order_id: int, payload: PaymentIntent, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if payload.provider != "manual":
        raise HTTPException(status_code=501, detail="Proveedor de pago pendiente de credenciales y contrato comercial")
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    if not payment:
        payment = Payment(order_id=order_id, amount=order.total_amount, provider="manual", status="pending", metadata_json={"mode": "contra_entrega"})
        db.add(payment)
        write_audit(db, "payment.intent_created", "order", str(order_id), metadata={"provider": "manual"})
        db.commit()
        db.refresh(payment)
    return {"id": payment.id, "order_id": order_id, "provider": payment.provider, "amount": payment.amount, "status": payment.status}


@router.put("/orders/{order_id}/shipment")
def update_shipment(order_id: int, payload: ShipmentUpdate, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.LOGISTICS_WRITE))):
    if not db.query(Order).filter(Order.id == order_id).first():
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    shipment = db.query(Shipment).filter(Shipment.order_id == order_id).first()
    if not shipment:
        shipment = Shipment(order_id=order_id)
        db.add(shipment)
    for key, value in payload.model_dump().items():
        setattr(shipment, key, str(value) if key == "cold_chain_required" else value)
    write_audit(db, "logistics.shipment_updated", "order", str(order_id), admin, {"status": payload.status, "cold_chain_required": payload.cold_chain_required})
    db.commit()
    db.refresh(shipment)
    return shipment
