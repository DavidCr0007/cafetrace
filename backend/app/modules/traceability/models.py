import enum

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProductType(str, enum.Enum):
    COFFEE = "coffee"
    MEAT = "meat"


class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (
        CheckConstraint("product_type IN ('coffee', 'meat')", name="ck_batches_product_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    producer_id = Column(Integer, ForeignKey("users.id"))
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    # Inmutable tras la creación: determina el esquema de `details` y el hash notarizado.
    product_type = Column(String(16), nullable=False, index=True)
    status = Column(String, default="harvested") # harvested, processing, ready, shipped

    # Atributos validados por app.modules.traceability.attributes según product_type.
    details = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    producer = relationship("User", foreign_keys=[producer_id], backref="produced_batches")
    seller = relationship("User", foreign_keys=[seller_id], backref="assigned_batches")
    records = relationship("TraceabilityRecord", back_populates="batch")
    products = relationship("Product", back_populates="batch")


class TraceabilityRecord(Base):
    __tablename__ = "traceability_records"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"))

    # Tipo de registro: iot, manual, blockchain_event
    record_type = Column(String, nullable=False)

    # Datos del sensor o evento: temperatura, humedad, ubicación
    data = Column(JSON, nullable=False)

    # Hash de la transacción en Polygon (si aplica)
    blockchain_hash = Column(String, nullable=True)
    external_id = Column(String, nullable=True, unique=True, index=True)

    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch", back_populates="records")


class IoTDevice(Base):
    __tablename__ = "iot_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    secret_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch")
