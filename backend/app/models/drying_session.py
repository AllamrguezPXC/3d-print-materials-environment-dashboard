from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.base import Base


class DryingSession(Base):
    """
    <summary>
    Represents a drying recommendation or validation session for a
    FilamentSpool at a dryer Location, optionally monitored by a Sensor
    placed in/near the dryer. This is advisory record-keeping only; the
    app does not control the physical dryer.
    </summary>
    """

    __tablename__ = "drying_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    spool_id: Mapped[int] = mapped_column(ForeignKey("filament_spools.id"), index=True)
    dryer_location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    sensor_id: Mapped[int | None] = mapped_column(ForeignKey("sensors.id"), default=None)
    target_temp_c: Mapped[float] = mapped_column()
    target_duration_hours: Mapped[float] = mapped_column()
    started_at: Mapped[datetime] = mapped_column(default=utc_now)
    ended_at: Mapped[datetime | None] = mapped_column(default=None)
    status: Mapped[str] = mapped_column(String(16), default="recommended")  # recommended, running, completed, failed, cancelled
    validation_notes: Mapped[str | None] = mapped_column(String(1000), default=None)

    spool: Mapped["FilamentSpool"] = relationship("FilamentSpool")
    dryer_location: Mapped["Location"] = relationship("Location")
    sensor: Mapped["Sensor | None"] = relationship("Sensor")
