from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.base import Base


class Alert(Base):
    """
    <summary>
    Represents a threshold violation (temperature, humidity, pressure, dew
    point, or sensor health) detected for a Reading, optionally scoped to
    an affected FilamentSpool/MaterialProfile.
    </summary>
    """

    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    reading_id: Mapped[int] = mapped_column(ForeignKey("readings.id"), index=True)
    sensor_id: Mapped[int] = mapped_column(ForeignKey("sensors.id"), index=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    spool_id: Mapped[int | None] = mapped_column(ForeignKey("filament_spools.id"), default=None)
    material_profile_id: Mapped[int | None] = mapped_column(ForeignKey("material_profiles.id"), default=None)
    severity: Mapped[str] = mapped_column(String(16))  # info, warning, critical
    metric: Mapped[str] = mapped_column(String(32))  # temperature, humidity, pressure, dew_point, sensor
    message: Mapped[str] = mapped_column(String(1000))
    recommended_action: Mapped[str | None] = mapped_column(String(1000), default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    resolved_at: Mapped[datetime | None] = mapped_column(default=None)

    reading: Mapped["Reading"] = relationship("Reading")
    sensor: Mapped["Sensor"] = relationship("Sensor")
    location: Mapped["Location"] = relationship("Location")
    spool: Mapped["FilamentSpool | None"] = relationship("FilamentSpool")
    material_profile: Mapped["MaterialProfile | None"] = relationship("MaterialProfile")
