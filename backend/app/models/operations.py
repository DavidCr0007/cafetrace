from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    provider = Column(String, nullable=False, default="manual")
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, nullable=False, default="pending")
    provider_reference = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    order = relationship("Order")


class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    carrier = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    cold_chain_required = Column(String, nullable=False, default="false")
    last_temperature_c = Column(Numeric(5, 2), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    order = relationship("Order")


class CompensationRule(Base):
    __tablename__ = "compensation_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String, nullable=True)
    category = Column(String, nullable=True)
    basis = Column(String, nullable=False)  # fixed_salary, volume_kg, sales_percentage
    rate = Column(Numeric(12, 4), nullable=False, default=0)
    fixed_amount = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String, nullable=False, default="COP")
    active = Column(String, nullable=False, default="true")
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class OrderSettlement(Base):
    __tablename__ = "order_settlements"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    gross_sales = Column(Numeric(12, 2), nullable=False)
    direct_cost = Column(Numeric(12, 2), nullable=False, default=0)
    logistics_cost = Column(Numeric(12, 2), nullable=False, default=0)
    producer_payout = Column(Numeric(12, 2), nullable=False, default=0)
    seller_commission = Column(Numeric(12, 2), nullable=False, default=0)
    platform_margin = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String, nullable=False, default="calculated")
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    order = relationship("Order")
    allocations = relationship("SettlementAllocation", back_populates="settlement", cascade="all, delete-orphan")


class SettlementAllocation(Base):
    __tablename__ = "settlement_allocations"

    id = Column(Integer, primary_key=True, index=True)
    settlement_id = Column(Integer, ForeignKey("order_settlements.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    participant_type = Column(String, nullable=False)  # producer, seller, platform
    basis = Column(String, nullable=False)
    category = Column(String, nullable=True)
    volume_kg = Column(Numeric(12, 3), nullable=False, default=0)
    sales_amount = Column(Numeric(12, 2), nullable=False, default=0)
    rate = Column(Numeric(12, 4), nullable=False, default=0)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    settlement = relationship("OrderSettlement", back_populates="allocations")
    user = relationship("User")


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    fixed_salary = Column(Numeric(12, 2), nullable=False, default=0)
    variable_amount = Column(Numeric(12, 2), nullable=False, default=0)
    deductions = Column(Numeric(12, 2), nullable=False, default=0)
    net_amount = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String, nullable=False, default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User")
