from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


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
