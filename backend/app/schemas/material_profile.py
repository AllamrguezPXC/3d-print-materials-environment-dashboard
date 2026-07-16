from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MaterialProfileBase(BaseModel):
    name: str
    family: str
    manufacturer: str | None = None
    variant: str | None = None
    ideal_temp_min_c: float
    ideal_temp_max_c: float
    warning_temp_min_c: float
    warning_temp_max_c: float
    critical_temp_min_c: float
    critical_temp_max_c: float
    ideal_rh_max_percent: float
    warning_rh_max_percent: float
    critical_rh_max_percent: float
    drying_temp_c: float
    drying_time_hours_min: float
    drying_time_hours_max: float
    storage_notes: str | None = None
    drying_notes: str | None = None
    source_notes: str | None = None


class MaterialProfileCreate(MaterialProfileBase):
    pass


class MaterialProfileUpdate(BaseModel):
    name: str | None = None
    family: str | None = None
    manufacturer: str | None = None
    variant: str | None = None
    ideal_temp_min_c: float | None = None
    ideal_temp_max_c: float | None = None
    warning_temp_min_c: float | None = None
    warning_temp_max_c: float | None = None
    critical_temp_min_c: float | None = None
    critical_temp_max_c: float | None = None
    ideal_rh_max_percent: float | None = None
    warning_rh_max_percent: float | None = None
    critical_rh_max_percent: float | None = None
    drying_temp_c: float | None = None
    drying_time_hours_min: float | None = None
    drying_time_hours_max: float | None = None
    storage_notes: str | None = None
    drying_notes: str | None = None
    source_notes: str | None = None


class MaterialProfileRead(MaterialProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deleted_at: datetime | None = None
