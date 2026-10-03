from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.permissions import Permission, require_permission
from app.models.order import Order
from app.models.operations import CompensationRule, OrderSettlement, PayrollEntry
from app.models.user import User
from app.schemas.finance import CompensationRuleCreate, PayrollCreate, SettlementCostInput
from app.services.audit import write_audit
from app.services.finance import calculate_settlement, payroll_preview

router = APIRouter()


@router.get("/summary")
def financial_summary(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.ACCOUNTING_READ))):
    settlements = db.query(OrderSettlement).all()
    return {
        "gross_sales": sum((s.gross_sales for s in settlements), 0),
        "direct_cost": sum((s.direct_cost for s in settlements), 0),
        "producer_payout": sum((s.producer_payout for s in settlements), 0),
        "seller_commission": sum((s.seller_commission for s in settlements), 0),
        "platform_margin": sum((s.platform_margin for s in settlements), 0),
        "settlements": len(settlements),
        "review_required": sum(1 for s in settlements if s.status == "review_required"),
    }


@router.get("/rules")
def list_rules(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.ACCOUNTING_READ))):
    return db.query(CompensationRule).order_by(CompensationRule.created_at.desc()).all()


@router.post("/rules")
def create_rule(payload: CompensationRuleCreate, db: Session = Depends(get_db), accountant: User = Depends(require_permission(Permission.ACCOUNTING_WRITE))):
    if payload.basis == "fixed_salary" and not payload.user_id:
        raise HTTPException(status_code=422, detail="El salario fijo debe estar asociado a un usuario")
    rule_data = payload.model_dump()
    rule_data["role"] = payload.role.value if payload.role else None
    rule = CompensationRule(**rule_data)
    db.add(rule)
    write_audit(db, "accounting.compensation_rule_created", "compensation_rule", actor=accountant, metadata={"basis": payload.basis, "category": payload.category})
    db.commit()
    db.refresh(rule)
    return rule


@router.post("/orders/{order_id}/settlement")
def calculate_order_settlement(order_id: int, payload: SettlementCostInput, db: Session = Depends(get_db), accountant: User = Depends(require_permission(Permission.ACCOUNTING_WRITE))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    settlement = db.query(OrderSettlement).filter(OrderSettlement.order_id == order_id).first()
    if settlement:
        settlement.allocations.clear()
    else:
        settlement = None
    new_settlement, _ = calculate_settlement(db, order, payload.logistics_cost)
    if settlement:
        for field in ("gross_sales", "direct_cost", "logistics_cost", "producer_payout", "seller_commission", "platform_margin", "status"):
            setattr(settlement, field, getattr(new_settlement, field))
        settlement.allocations = new_settlement.allocations
    else:
        settlement = new_settlement
        db.add(settlement)
    write_audit(db, "accounting.order_settlement_calculated", "order", str(order_id), accountant, {"platform_margin": str(settlement.platform_margin), "status": settlement.status})
    db.commit()
    db.refresh(settlement)
    return settlement


@router.get("/orders/{order_id}/settlement")
def read_order_settlement(order_id: int, db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.ACCOUNTING_READ))):
    settlement = db.query(OrderSettlement).filter(OrderSettlement.order_id == order_id).first()
    if not settlement:
        raise HTTPException(status_code=404, detail="El pedido aún no tiene liquidación")
    return settlement


@router.post("/payroll/preview")
def create_payroll_preview(payload: PayrollCreate, db: Session = Depends(get_db), accountant: User = Depends(require_permission(Permission.ACCOUNTING_WRITE))):
    user = db.query(User).filter(User.id == payload.user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario activo no encontrado")
    if payload.period_end <= payload.period_start:
        raise HTTPException(status_code=422, detail="El periodo no es válido")
    entry = payroll_preview(db, user, payload.period_start, payload.period_end, payload.deductions)
    db.add(entry)
    write_audit(db, "accounting.payroll_preview_created", "user", str(user.id), accountant, {"period_start": payload.period_start.isoformat(), "period_end": payload.period_end.isoformat()})
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/payroll")
def list_payroll(limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.ACCOUNTING_READ))):
    return db.query(PayrollEntry).order_by(PayrollEntry.created_at.desc()).limit(limit).all()
