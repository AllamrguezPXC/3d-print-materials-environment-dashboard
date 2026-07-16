from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin


class MaterialProfile(SoftDeleteMixin, Base):
    """
    <summary>
    Defines environmental thresholds and drying recommendations for a
    filament family or manufacturer-specific material. Manufacturer-specific
    profiles override generic family defaults; thresholds here are editable
    configuration, not permanent hard-coded truth.
    </summary>
    """

    __tablename__ = "material_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    family: Mapped[str] = mapped_column(String(120))
    manufacturer: Mapped[str | None] = mapped_column(String(120), default=None)
    variant: Mapped[str | None] = mapped_column(String(120), default=None)

    ideal_temp_min_c: Mapped[float] = mapped_column()
    ideal_temp_max_c: Mapped[float] = mapped_column()
    warning_temp_min_c: Mapped[float] = mapped_column()
    warning_temp_max_c: Mapped[float] = mapped_column()
    critical_temp_min_c: Mapped[float] = mapped_column()
    critical_temp_max_c: Mapped[float] = mapped_column()

    ideal_rh_max_percent: Mapped[float] = mapped_column()
    warning_rh_max_percent: Mapped[float] = mapped_column()
    critical_rh_max_percent: Mapped[float] = mapped_column()

    drying_temp_c: Mapped[float] = mapped_column()
    drying_time_hours_min: Mapped[float] = mapped_column()
    drying_time_hours_max: Mapped[float] = mapped_column()

    storage_notes: Mapped[str | None] = mapped_column(String(1000), default=None)
    drying_notes: Mapped[str | None] = mapped_column(String(1000), default=None)
    source_notes: Mapped[str | None] = mapped_column(String(1000), default=None)

    spools: Mapped[list["FilamentSpool"]] = relationship("FilamentSpool", back_populates="material_profile")
