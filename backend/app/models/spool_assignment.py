from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.base import Base


class SpoolAssignment(Base):
    """
    <summary>
    Represents which FilamentSpool is currently (or was previously)
    assigned to a printer/AMS slot, dryer, or storage Location.
    </summary>
    """

    __tablename__ = "spool_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    spool_id: Mapped[int] = mapped_column(ForeignKey("filament_spools.id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    slot_name: Mapped[str | None] = mapped_column(String(120), default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    assigned_at: Mapped[datetime] = mapped_column(default=utc_now)
    removed_at: Mapped[datetime | None] = mapped_column(default=None)

    spool: Mapped["FilamentSpool"] = relationship("FilamentSpool", back_populates="assignments")
    location: Mapped["Location"] = relationship("Location")
