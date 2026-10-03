"""complete seller relationship constraint on SQLite deployments

Revision ID: af56f178c290
Revises: ae45f067b189
"""
from alembic import op
import sqlalchemy as sa

revision = "af56f178c290"
down_revision = "ae45f067b189"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("orders", recreate="always") as batch_op:
            batch_op.create_foreign_key("fk_orders_seller_id_users", "users", ["seller_id"], ["id"])


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("orders", recreate="always") as batch_op:
            batch_op.drop_constraint("fk_orders_seller_id_users", type_="foreignkey")
