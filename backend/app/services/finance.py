from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from app.models.order import Order
from app.models.operations import CompensationRule, OrderSettlement, SettlementAllocation, PayrollEntry
from app.models.product import Product
from app.models.user import User, UserRole

CENT = Decimal("0.01")
KG_SCALE = Decimal("0.001")


def money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def _rule(db: Session, user_id: int | None, role: UserRole | None, category: str | None, basis: str) -> CompensationRule | None:
    rules = db.query(CompensationRule).filter(CompensationRule.basis == basis, CompensationRule.active == "true").all()
    ranked = []
    for rule in rules:
        if rule.user_id is not None and rule.user_id != user_id:
            continue
        if rule.role is not None and rule.role not in ({role.value} if role else set()):
            continue
        if rule.category is not None and rule.category != category:
            continue
        rank = (2 if rule.user_id else 0) + (1 if rule.category else 0) + (1 if rule.role else 0)
        ranked.append((rank, rule))
    return max(ranked, key=lambda item: item[0])[1] if ranked else None


def calculate_settlement(db: Session, order: Order, logistics_cost: Decimal = Decimal("0")) -> tuple[OrderSettlement, list[SettlementAllocation]]:
    gross = money(Decimal(order.total_amount))
    direct_cost = Decimal("0")
    producer_total = Decimal("0")
    seller_total = Decimal("0")
    allocations: list[SettlementAllocation] = []
    for item in order.items:
        product: Product = item.product
        attrs = product.attributes or {}
        category = str(attrs.get("category", "other"))
        quantity = Decimal(item.quantity)
        volume_kg = Decimal(str(attrs.get("weight_kg", "1"))) * quantity
        item_sales = money(Decimal(item.subtotal))
        unit_cost = Decimal(str(attrs.get("direct_cost", "0")))
        direct_cost += unit_cost * quantity
        producer_id = product.batch.producer_id if product.batch else None
        producer_rule = _rule(db, producer_id, UserRole.PRODUCER, category, "volume_kg") or _rule(db, producer_id, UserRole.PRODUCER, category, "sales_percentage")
        if producer_rule:
            amount = volume_kg * producer_rule.rate if producer_rule.basis == "volume_kg" else item_sales * producer_rule.rate / Decimal("100")
            amount = money(amount)
            producer_total += amount
            allocations.append(SettlementAllocation(user_id=producer_id, participant_type="producer", basis=producer_rule.basis, category=category, volume_kg=volume_kg, sales_amount=item_sales, rate=producer_rule.rate, amount=amount))
        seller_rule = _rule(db, order.seller_id, UserRole.SELLER, category, "sales_percentage") if order.seller_id else None
        if seller_rule:
            amount = money(item_sales * seller_rule.rate / Decimal("100"))
            seller_total += amount
            allocations.append(SettlementAllocation(user_id=order.seller_id, participant_type="seller", basis=seller_rule.basis, category=category, volume_kg=volume_kg, sales_amount=item_sales, rate=seller_rule.rate, amount=amount))
    direct_cost = money(direct_cost)
    platform_margin = money(gross - direct_cost - money(logistics_cost) - producer_total - seller_total)
    settlement = OrderSettlement(order_id=order.id, gross_sales=gross, direct_cost=direct_cost, logistics_cost=money(logistics_cost), producer_payout=money(producer_total), seller_commission=money(seller_total), platform_margin=platform_margin, status="review_required" if platform_margin < 0 else "calculated")
    allocations.append(SettlementAllocation(participant_type="platform", basis="residual_margin", category=None, volume_kg=Decimal("0"), sales_amount=gross, rate=Decimal("0"), amount=platform_margin))
    settlement.allocations = allocations
    return settlement, allocations


def payroll_preview(db: Session, user: User, period_start, period_end, deductions: Decimal = Decimal("0")) -> PayrollEntry:
    fixed_rule = _rule(db, user.id, user.role, None, "fixed_salary")
    fixed = fixed_rule.fixed_amount if fixed_rule else Decimal("0")
    variable = sum((Decimal(allocation.amount) for allocation in db.query(SettlementAllocation).join(OrderSettlement).join(Order).filter(SettlementAllocation.user_id == user.id, OrderSettlement.calculated_at >= period_start, OrderSettlement.calculated_at <= period_end)), Decimal("0"))
    return PayrollEntry(user_id=user.id, period_start=period_start, period_end=period_end, fixed_salary=money(fixed), variable_amount=money(variable), deductions=money(deductions), net_amount=money(fixed + variable - deductions), status="draft")
