from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column


class SoftDeleteMixin:
    """Adds a nullable `deleted_at` column so a row can be archived (hidden
    from normal listings/lookups) without being destroyed -- restorable via
    setting it back to None. The existing hard `DELETE` endpoints are
    unaffected by this mixin; they remain the permanent-removal path used
    only from the Trash view."""

    deleted_at: Mapped[datetime | None] = mapped_column(default=None)
