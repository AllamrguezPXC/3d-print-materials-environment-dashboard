from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class FilamentSpoolBase(BaseModel):
    material_profile_id: int
    brand: str
    color: str
    diameter_mm: float = 1.75
    initial_weight_g: float | None = None
    remaining_weight_g: float | None = None
    quantity_label: str | None = None
    purchase_date: date | None = None
    opened_at: datetime | None = None
    last_dried_at: datetime | None = None
    status: str = "unknown"  # ready, watch, needs_drying, quarantine, unknown


class FilamentSpoolCreate(FilamentSpoolBase):
    pass


class FilamentSpoolUpdate(BaseModel):
    material_profile_id: int | None = None
    brand: str | None = None
    color: str | None = None
    diameter_mm: float | None = None
    initial_weight_g: float | None = None
    remaining_weight_g: float | None = None
    quantity_label: str | None = None
    purchase_date: date | None = None
    opened_at: datetime | None = None
    last_dried_at: datetime | None = None
    status: str | None = None


class FilamentSpoolRead(FilamentSpoolBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
