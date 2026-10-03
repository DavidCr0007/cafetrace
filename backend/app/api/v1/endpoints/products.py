from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.product import Product as ProductModel
from app.models.batch import Batch as BatchModel
from app.schemas.product import Product, ProductCreate
from app.api.deps import get_current_producer
from app.models.user import User as UserModel

router = APIRouter()

@router.post("", response_model=Product, include_in_schema=False)
@router.post("/", response_model=Product)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_producer)):
    batch = db.query(BatchModel).filter(BatchModel.id == product.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    if current_user.role.value != "admin" and batch.producer_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado para este lote")
    db_product = ProductModel(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("", response_model=List[Product], include_in_schema=False)
@router.get("/", response_model=List[Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(ProductModel).offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
