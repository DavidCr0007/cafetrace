from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    producer_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="harvested") # harvested, processing, ready, shipped
    
    # Datos dinámicos: variedad, altitud, método de beneficio, etc.
    details = Column(JSON, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    producer = relationship("User", backref="batches")
    records = relationship("TraceabilityRecord", back_populates="batch")
    products = relationship("Product", back_populates="batch")
