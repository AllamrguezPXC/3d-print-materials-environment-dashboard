from datetime import date, datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FilamentSpool(Base):
    """
    <summary>
    Represents a physical filament spool, linked to the MaterialProfile
    that defines its environmental thresholds and drying recommendations.
    </summary>
    """

    __tablename__ = "filament_spools"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_profile_id: Mapped[int] = mapped_column(ForeignKey("material_profiles.id"))
    brand: Mapped[str] = mapped_column(String(120))
    color: Mapped[str | None] = mapped_column(String(60), default=None)
    diameter_mm: Mapped[float] = mapped_column(default=1.75)
    initial_weight_g: Mapped[float | None] = mapped_column(default=None)
    remaining_weight_g: Mapped[float | None] = mapped_column(default=None)
    quantity_label: Mapped[str | None] = mapped_column(String(60), default=None)
    purchase_date: Mapped[date | None] = mapped_column(default=None)
    opened_at: Mapped[datetime | None] = mapped_column(default=None)
    last_dried_at: Mapped[datetime | None] = mapped_column(default=None)
    status: Mapped[str] = mapped_column(String(32), default="unknown")  # ready, watch, needs_drying, quarantine, unknown

    material_profile: Mapped["MaterialProfile"] = relationship("MaterialProfile", back_populates="spools")
    assignments: Mapped[list["SpoolAssignment"]] = relationship("SpoolAssignment", back_populates="spool")
