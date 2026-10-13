from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    producer_id = Column(Integer, ForeignKey("users.id"))
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String, default="harvested") # harvested, processing, ready, shipped
    
    # Datos dinámicos: variedad, altitud, método de beneficio, etc.
    details = Column(JSON, nullable=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    producer = relationship("User", foreign_keys=[producer_id], backref="produced_batches")
    seller = relationship("User", foreign_keys=[seller_id], backref="assigned_batches")
    records = relationship("TraceabilityRecord", back_populates="batch")
    products = relationship("Product", back_populates="batch")
