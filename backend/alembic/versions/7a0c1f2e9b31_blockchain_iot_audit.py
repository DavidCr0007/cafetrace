"""blockchain notarization, authenticated IoT and audit events

Revision ID: 7a0c1f2e9b31
Revises: 4d4f2d7a8f2b
"""
from alembic import op
import sqlalchemy as sa

revision = "7a0c1f2e9b31"
down_revision = "4d4f2d7a8f2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("traceability_records", sa.Column("external_id", sa.String(), nullable=True))
    op.create_index("ix_traceability_records_external_id", "traceability_records", ["external_id"])
    op.create_table(
        "iot_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("batches.id"), nullable=True),
        sa.Column("secret_hash", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_iot_devices_device_id", "iot_devices", ["device_id"], unique=True)
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("resource_id", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_action", "audit_events", ["action"])
    op.create_index("ix_audit_events_timestamp", "audit_events", ["timestamp"])
    op.create_table(
        "blockchain_notarizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("batches.id"), nullable=False),
        sa.Column("data_hash", sa.String(), nullable=False),
        sa.Column("transaction_hash", sa.String(), nullable=False),
        sa.Column("block_number", sa.Integer(), nullable=True),
        sa.Column("chain_id", sa.Integer(), nullable=False),
        sa.Column("network", sa.String(), nullable=False),
        sa.Column("contract_address", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("batch_id"),
        sa.UniqueConstraint("transaction_hash"),
    )


def downgrade() -> None:
    op.drop_table("blockchain_notarizations")
    op.drop_index("ix_audit_events_timestamp", table_name="audit_events")
    op.drop_index("ix_audit_events_action", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_iot_devices_device_id", table_name="iot_devices")
    op.drop_table("iot_devices")
    op.drop_index("ix_traceability_records_external_id", table_name="traceability_records")
    op.drop_column("traceability_records", "external_id")
