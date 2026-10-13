"""PostgreSQL ownership, refresh sessions and legacy role retirement.

Revision ID: bf67a289d401
Revises: af56f178c290
"""
from alembic import op
import sqlalchemy as sa

revision = "bf67a289d401"
down_revision = "af56f178c290"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        raise RuntimeError("CaféTrace solo admite migraciones sobre PostgreSQL")

    op.add_column("batches", sa.Column("seller_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_batches_seller_id_users", "batches", "users", ["seller_id"], ["id"])
    op.create_index("ix_batches_seller_id", "batches", ["seller_id"])

    op.add_column("products", sa.Column("seller_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_products_seller_id_users", "products", "users", ["seller_id"], ["id"])
    op.create_index("ix_products_seller_id", "products", ["seller_id"])

    op.add_column("orders", sa.Column("customer_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_orders_customer_user_id_users", "orders", "users", ["customer_user_id"], ["id"])
    op.create_index("ix_orders_customer_user_id", "orders", ["customer_user_id"])

    op.execute("UPDATE users SET role = 'BUYER' WHERE role::text = 'CUSTOMER'")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE text USING role::text")
    op.execute("DROP TYPE userrole")
    op.execute("CREATE TYPE userrole AS ENUM ('ADMIN','ACCOUNTANT','SELLER','PRODUCER','MARKETING','BUYER','AUDITOR')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole")

    op.drop_index("ix_traceability_records_external_id", table_name="traceability_records")
    op.create_index("ix_traceability_records_external_id", "traceability_records", ["external_id"], unique=True)

    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column("family_id", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_hash", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_refresh_sessions_id", "refresh_sessions", ["id"])
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])
    op.create_index("ix_refresh_sessions_token_hash", "refresh_sessions", ["token_hash"], unique=True)
    op.create_index("ix_refresh_sessions_family_id", "refresh_sessions", ["family_id"])


def downgrade() -> None:
    op.drop_table("refresh_sessions")
    op.drop_index("ix_traceability_records_external_id", table_name="traceability_records")
    op.create_index("ix_traceability_records_external_id", "traceability_records", ["external_id"])
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE text USING role::text")
    op.execute("DROP TYPE userrole")
    op.execute("CREATE TYPE userrole AS ENUM ('ADMIN','ACCOUNTANT','SELLER','PRODUCER','MARKETING','BUYER','AUDITOR','CUSTOMER')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole")
    op.drop_index("ix_orders_customer_user_id", table_name="orders")
    op.drop_constraint("fk_orders_customer_user_id_users", "orders", type_="foreignkey")
    op.drop_column("orders", "customer_user_id")
    op.drop_index("ix_products_seller_id", table_name="products")
    op.drop_constraint("fk_products_seller_id_users", "products", type_="foreignkey")
    op.drop_column("products", "seller_id")
    op.drop_index("ix_batches_seller_id", table_name="batches")
    op.drop_constraint("fk_batches_seller_id_users", "batches", type_="foreignkey")
    op.drop_column("batches", "seller_id")
