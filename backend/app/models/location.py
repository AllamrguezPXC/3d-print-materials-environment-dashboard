from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Location(Base):
    """
    <summary>
    Represents where a sensor is installed: a printer's AMS/external spool
    holder, a storage box, a dry box, a dryer, or a room. When
    location_type == "dryer", max_temp_c/notes describe the dryer's
    capability so the drying-recommendation service can warn when a
    requested drying temperature exceeds what the dryer can sustain.
    </summary>
    """

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location_type: Mapped[str] = mapped_column(String(32))
    printer_id: Mapped[int | None] = mapped_column(ForeignKey("printers.id"), default=None)
    description: Mapped[str | None] = mapped_column(String(500), default=None)

    # Only meaningful when location_type == "printer_ams": the slot's stable
    # ordinal within its printer's AMS (0-based), so a printer's slots can be
    # queried/rendered in order. Null for every other location_type.
    slot_index: Mapped[int | None] = mapped_column(default=None)

    # Dryer-capability modeling (only meaningful when location_type == "dryer").
    max_temp_c: Mapped[float | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(String(500), default=None)

    printer: Mapped["Printer | None"] = relationship("Printer", back_populates="locations")
    sensors: Mapped[list["Sensor"]] = relationship("Sensor", back_populates="location")
