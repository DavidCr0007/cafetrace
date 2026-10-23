"""Typed traceability: product_type on batches.

Revision ID: c078b39ae512
Revises: bf67a289d401
"""
from alembic import op
import sqlalchemy as sa

revision = "c078b39ae512"
down_revision = "bf67a289d401"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        raise RuntimeError("CaféTrace solo admite migraciones sobre PostgreSQL")

    op.add_column("batches", sa.Column("product_type", sa.String(length=16), nullable=True))
    # Lotes previos: se clasifican como cárnicos si declaran atributos sanitarios o de especie.
    # Sus `details` legados no se revalidan; el esquema tipado aplica a escrituras nuevas.
    op.execute(
        """
        UPDATE batches
        SET product_type = CASE
            WHEN details IS NOT NULL
             AND (details::jsonb ? 'species' OR details::jsonb ? 'sanitary_license')
            THEN 'meat'
            ELSE 'coffee'
        END
        """
    )
    op.alter_column("batches", "product_type", nullable=False)
    op.create_check_constraint("ck_batches_product_type", "batches", "product_type IN ('coffee', 'meat')")
    op.create_index(op.f("ix_batches_product_type"), "batches", ["product_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_batches_product_type"), table_name="batches")
    op.drop_constraint("ck_batches_product_type", "batches", type_="check")
    op.drop_column("batches", "product_type")
