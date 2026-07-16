from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin


class Printer(SoftDeleteMixin, Base):
    """
    <summary>
    Represents a 3D printer (e.g. a Bambu Lab A1 mini, P1S, or P1P) that
    Locations (AMS slots, external spool holders) can be associated with.
    </summary>
    """

    __tablename__ = "printers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    brand: Mapped[str] = mapped_column(String(120))
    model: Mapped[str] = mapped_column(String(120))
    serial_number: Mapped[str | None] = mapped_column(String(120), default=None)
    notes: Mapped[str | None] = mapped_column(String(500), default=None)
    # ams, external_spool, storage_only, manual -- purely descriptive
    # configuration; does not gate the AMS slot grid, which is still
    # inferred from actual Location rows (see AmsSlotGrid/ReadFromAmsPanel).
    filament_system_type: Mapped[str] = mapped_column(String(32), default="manual")
    # activo, inactivo, mantenimiento -- administrative status only; never
    # gates or suppresses alerts, which reflect real environmental risk
    # regardless of a printer's operational state.
    operational_status: Mapped[str] = mapped_column(String(32), default="activo")

    locations: Mapped[list["Location"]] = relationship("Location", back_populates="printer")
