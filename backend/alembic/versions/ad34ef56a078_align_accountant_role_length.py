"""align role storage with ACCOUNTANT value

Revision ID: ad34ef56a078
Revises: ac23de45f067
"""
from alembic import op
import sqlalchemy as sa

revision = "ad34ef56a078"
down_revision = "ac23de45f067"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("role", existing_type=sa.String(length=9), type_=sa.String(length=10))


def downgrade() -> None:
    if op.get_bind().dialect.name == "sqlite":
        with op.batch_alter_table("users") as batch_op:
            batch_op.alter_column("role", existing_type=sa.String(length=10), type_=sa.String(length=9))
