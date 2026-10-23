from fastapi import HTTPException
from sqlalchemy import false
from sqlalchemy.orm import Query, Session

from app.modules.identity.models import User, UserRole
from app.modules.orders.models import Order

# Roles que responden comercialmente por un pedido: vendedor asignado o productor que vende directo.
COMMERCIAL_ROLES = {UserRole.SELLER, UserRole.PRODUCER}
OVERSIGHT_ROLES = {UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.AUDITOR}


def scope_orders(query: Query, user: User) -> Query:
    """Limita los pedidos al ámbito del actor; cualquier rol no contemplado no ve nada."""
    if user.role in OVERSIGHT_ROLES:
        return query
    if user.role == UserRole.BUYER:
        return query.filter(Order.customer_user_id == user.id)
    if user.role in COMMERCIAL_ROLES:
        return query.filter(Order.seller_id == user.id)
    return query.filter(false())


def get_scoped_order(db: Session, order_id: int, user: User) -> Order:
    # 404 también para pedidos fuera de ámbito: no se revela su existencia.
    order = scope_orders(db.query(Order).filter(Order.id == order_id), user).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order
