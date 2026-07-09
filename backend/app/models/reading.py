from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Reading(Base):
    """
    <summary>
    Represents a single persisted environmental sample captured from a
    Sensor (real, mock, or manually entered), optionally tagged with the
    Location it was recorded in/near.
    </summary>
    """

    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    sensor_id: Mapped[int] = mapped_column(ForeignKey("sensors.id"), index=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), default=None, index=True)
    timestamp: Mapped[datetime] = mapped_column(index=True)
    temperature_c: Mapped[float] = mapped_column()
    relative_humidity_percent: Mapped[float] = mapped_column()
    pressure_pa: Mapped[float] = mapped_column()
    pressure_kpa: Mapped[float] = mapped_column()
    dew_point_c: Mapped[float | None] = mapped_column(default=None)
    source: Mapped[str] = mapped_column(String(16))  # real, mock, manual
    raw_payload: Mapped[str | None] = mapped_column(String(500), default=None)

    sensor: Mapped["Sensor"] = relationship("Sensor")
    location: Mapped["Location | None"] = relationship("Location")
