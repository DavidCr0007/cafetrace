from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Numeric(12, 2), nullable=False)
    stock = Column(Integer, default=0)
    
    # Atributos específicos: Score SCA, Perfil de Taza, Registro Sanitario
    attributes = Column(JSON, nullable=True)
    
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    batch = relationship("Batch", back_populates="products")
