"""add indexes declared by SQLAlchemy models

Revision ID: 8b1d2e3f4a55
Revises: 7a0c1f2e9b31
"""
from alembic import op

revision = "8b1d2e3f4a55"
down_revision = "7a0c1f2e9b31"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_iot_devices_id", "iot_devices", ["id"])
    op.create_index("ix_audit_events_id", "audit_events", ["id"])
    op.create_index("ix_blockchain_notarizations_id", "blockchain_notarizations", ["id"])


def downgrade() -> None:
    op.drop_index("ix_blockchain_notarizations_id", table_name="blockchain_notarizations")
    op.drop_index("ix_audit_events_id", table_name="audit_events")
    op.drop_index("ix_iot_devices_id", table_name="iot_devices")
