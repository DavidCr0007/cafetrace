"""Carga todos los modelos ORM para que Base.metadata y las relaciones por nombre estén completas."""
# ruff: noqa: F401

from app.core.database import Base
from app.modules.identity.models import User, PasswordResetRequest, RefreshSession
from app.modules.audit.models import AuditEvent
from app.modules.traceability.models import Batch, TraceabilityRecord, IoTDevice
from app.modules.blockchain.models import BlockchainNotarization
from app.modules.catalog.models import Product
from app.modules.orders.models import Order, OrderItem
from app.modules.payments.models import Payment
from app.modules.logistics.models import Shipment
from app.modules.accounting.models import CompensationRule, OrderSettlement, SettlementAllocation, PayrollEntry
