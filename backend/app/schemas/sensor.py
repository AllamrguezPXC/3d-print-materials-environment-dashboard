from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorBase(BaseModel):
    name: str
    model: str
    serial_number: str
    sensor_type: str  # dracal_vcp, dracal_cli, mock, manual, real (see Requirements.md section 6)
    port: str | None = None
    is_active: bool = True
    location_id: int | None = None


class SensorCreate(SensorBase):
    pass


class SensorUpdate(BaseModel):
    name: str | None = None
    model: str | None = None
    serial_number: str | None = None
    sensor_type: str | None = None
    port: str | None = None
    is_active: bool | None = None
    location_id: int | None = None


class SensorRead(SensorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
