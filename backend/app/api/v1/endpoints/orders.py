from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.order import Order as OrderModel, OrderItem as OrderItemModel
from app.models.product import Product as ProductModel
from app.schemas.order import OrderCreate, OrderRead, OrderStatusUpdate
from app.api.deps import get_optional_current_user
from app.models.user import User as UserModel
from app.core.permissions import Permission, require_permission
from app.models.user import UserRole
from app.services.audit import write_audit

router = APIRouter()

@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(order_in: OrderCreate, db: Session = Depends(get_db), current_user: UserModel | None = Depends(get_optional_current_user)):
    """
    Crea un nuevo pedido B2C con validación de stock y cálculo de totales en servidor.
    """
    if not order_in.items:
        raise HTTPException(status_code=400, detail="El pedido debe contener al menos un producto")

    total_amount = Decimal("0.00")
    order_items = []
    seller_ids: set[int] = set()

    requested_ids = [item.product_id for item in order_in.items]
    if len(requested_ids) != len(set(requested_ids)):
        raise HTTPException(status_code=422, detail="No se permiten productos repetidos en el pedido")

    # Validar productos y disponibilidad de stock
    for item in order_in.items:
        product = db.query(ProductModel).filter(ProductModel.id == item.product_id).with_for_update().first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto con ID {item.product_id} no encontrado"
            )
        
        if item.quantity > 1000:
            raise HTTPException(status_code=422, detail="La cantidad máxima por producto es 1000")
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}, solicitado: {item.quantity}"
            )

        # Descontar stock
        product.stock -= item.quantity
        db.add(product)
        if product.seller_id:
            seller_ids.add(product.seller_id)

        subtotal = (Decimal(str(product.price)) * item.quantity).quantize(Decimal("0.01"))
        total_amount += subtotal

        order_item = OrderItemModel(
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
            subtotal=subtotal
        )
        order_items.append(order_item)

    # Crear la orden
    db_order = OrderModel(
        customer_name=order_in.customer_name,
        customer_email=order_in.customer_email,
        customer_phone=order_in.customer_phone,
        shipping_address=order_in.shipping_address,
        city=order_in.city,
        department=order_in.department,
        total_amount=total_amount.quantize(Decimal("0.01")),
        status="confirmed",
        payment_method=order_in.payment_method,
        notes=order_in.notes,
        customer_user_id=current_user.id if current_user and current_user.role == UserRole.BUYER else None,
        seller_id=next(iter(seller_ids)) if len(seller_ids) == 1 else None,
        items=order_items
    )

    try:
        db.add(db_order)
        db.flush()
        write_audit(db, "orders.order_created", "order", str(db_order.id), current_user, {"seller_id": db_order.seller_id, "authenticated_buyer": bool(db_order.customer_user_id)})
        db.commit()
        db.refresh(db_order)
    except Exception:
        db.rollback()
        raise

    return db_order


@router.get("", response_model=List[OrderRead], include_in_schema=False)
@router.get("/", response_model=List[OrderRead])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.ORDERS_READ))):
    """
    Lista todos los pedidos registrados.
    """
    query = db.query(OrderModel)
    if current_user.role == UserRole.SELLER:
        query = query.filter(OrderModel.seller_id == current_user.id)
    elif current_user.role == UserRole.BUYER:
        query = query.filter(OrderModel.customer_user_id == current_user.id)
    orders = query.order_by(OrderModel.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=OrderRead)
def read_order(order_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.ORDERS_READ))):
    """
    Obtiene el detalle completo de un pedido por su ID.
    """
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if current_user.role == UserRole.SELLER and order.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if current_user.role == UserRole.BUYER and order.customer_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(order_id: int, status_in: OrderStatusUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.LOGISTICS_WRITE))):
    """
    Actualiza el estado de despacho de un pedido.
    """
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if status_in.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_statuses)}"
        )

    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if current_user.role == UserRole.SELLER and order.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    previous_status = order.status
    order.status = status_in.status
    db.add(order)
    write_audit(db, "orders.status_updated", "order", str(order.id), current_user, {"before": previous_status, "after": order.status})
    db.commit()
    db.refresh(order)
    return order
