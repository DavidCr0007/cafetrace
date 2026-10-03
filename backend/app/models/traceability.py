from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

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
    external_id = Column(String, nullable=True, index=True)
    
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


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("User")


class BlockchainNotarization(Base):
    __tablename__ = "blockchain_notarizations"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), unique=True, nullable=False)
    data_hash = Column(String, nullable=False)
    transaction_hash = Column(String, nullable=False, unique=True)
    block_number = Column(Integer, nullable=True)
    chain_id = Column(Integer, nullable=False)
    network = Column(String, nullable=False)
    contract_address = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("Batch")
