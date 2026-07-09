from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    reading_id: int | None = None
    sensor_id: int | None = None
    location_id: int | None = None
    spool_id: int | None = None
    material_profile_id: int | None = None
    severity: Literal["info", "warning", "critical"]
    metric: Literal["temperature", "humidity", "pressure", "dew_point", "sensor"]
    message: str
    recommended_action: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    resolved_at: datetime | None = None


class AlertResolveResponse(BaseModel):
    alert: AlertRead
