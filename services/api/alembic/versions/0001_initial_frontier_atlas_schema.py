"""Initial Frontier Atlas relational schema (30 domain and operational tables).

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-20 03:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

import app.models  # noqa: F401
from alembic import op
from app.db.session import Base

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
