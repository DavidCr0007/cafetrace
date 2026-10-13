from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.product import Product as ProductModel
from app.models.batch import Batch as BatchModel
from app.schemas.product import Product, ProductCreate, ProductUpdate
from app.schemas.batch import Batch
from app.models.user import User as UserModel, UserRole
from app.core.permissions import Permission, require_permission
from app.services.audit import write_audit

router = APIRouter()

@router.post("", response_model=Product, include_in_schema=False)
@router.post("/", response_model=Product)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(require_permission(Permission.CATALOG_WRITE))):
    batch = db.query(BatchModel).filter(BatchModel.id == product.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role == UserRole.PRODUCER and batch.producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este lote")
    if current_user.role == UserRole.SELLER and batch.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="El vendedor no está asignado a este lote")
    if product.seller_id:
        seller = db.query(UserModel).filter(UserModel.id == product.seller_id, UserModel.role == UserRole.SELLER, UserModel.is_active.is_(True)).first()
        if not seller:
            raise HTTPException(status_code=422, detail="El responsable comercial debe ser un vendedor activo")
    values = product.model_dump()
    if current_user.role == UserRole.SELLER:
        values["seller_id"] = current_user.id
    elif current_user.role == UserRole.PRODUCER:
        values["seller_id"] = batch.seller_id
    db_product = ProductModel(**values)
    db.add(db_product)
    db.flush()
    write_audit(db, "catalog.product_created", "product", str(db_product.id), current_user, {"batch_id": batch.id})
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("", response_model=List[Product], include_in_schema=False)
@router.get("/", response_model=List[Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(ProductModel).offset(skip).limit(limit).all()
    return products

@router.get("/management/accessible", response_model=List[Product])
def read_accessible_products(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.CATALOG_WRITE)),
):
    query = db.query(ProductModel)
    if current_user.role == UserRole.SELLER:
        query = query.filter(ProductModel.seller_id == current_user.id)
    elif current_user.role == UserRole.PRODUCER:
        query = query.join(BatchModel).filter(BatchModel.producer_id == current_user.id)
    return query.order_by(ProductModel.created_at.desc()).all()


@router.get("/management/batches", response_model=List[Batch])
def read_catalog_batches(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.CATALOG_WRITE)),
):
    query = db.query(BatchModel)
    if current_user.role == UserRole.SELLER:
        query = query.filter(BatchModel.seller_id == current_user.id)
    elif current_user.role == UserRole.PRODUCER:
        query = query.filter(BatchModel.producer_id == current_user.id)
    return query.order_by(BatchModel.created_at.desc()).all()


@router.get("/{product_id}", response_model=Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=Product)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_permission(Permission.CATALOG_WRITE)),
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    batch = db.query(BatchModel).filter(BatchModel.id == product.batch_id).first()
    if current_user.role == UserRole.SELLER and product.seller_id != current_user.id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if current_user.role == UserRole.PRODUCER and (not batch or batch.producer_id != current_user.id):
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    before = {"name": product.name, "price": str(product.price), "stock": product.stock, "seller_id": product.seller_id}
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "seller_id" and value is not None:
            seller = db.query(UserModel).filter(UserModel.id == value, UserModel.role == UserRole.SELLER, UserModel.is_active.is_(True)).first()
            if not seller:
                raise HTTPException(status_code=422, detail="El responsable comercial debe ser un vendedor activo")
        setattr(product, key, value)
    write_audit(db, "catalog.product_updated", "product", str(product.id), current_user, {"before": before})
    db.commit()
    db.refresh(product)
    return product
