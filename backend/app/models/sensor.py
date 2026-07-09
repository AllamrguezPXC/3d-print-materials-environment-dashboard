from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.base import Base


class Sensor(Base):
    """
    <summary>
    Represents a physical or mock environmental sensor (e.g. a Dracal
    VCP-PTH450-CAL unit or a MockSensorReader instance) that can be
    optionally assigned to a Location.
    </summary>
    """

    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    model: Mapped[str] = mapped_column(String(120))
    serial_number: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    sensor_type: Mapped[str] = mapped_column(String(32))  # dracal_vcp, dracal_cli, mock
    port: Mapped[str | None] = mapped_column(String(32), default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    location_id: Mapped[int | None] = mapped_column(ForeignKey("locations.id"), default=None)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    location: Mapped["Location | None"] = relationship("Location", back_populates="sensors")
