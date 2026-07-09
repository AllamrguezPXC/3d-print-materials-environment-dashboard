from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SensorInfo(BaseModel):
    serial_number: str
    model: str = "VCP-PTH450-CAL"
    sensor_type: Literal["real", "mock", "manual"]


class CurrentReadingResponse(BaseModel):
    """
    <summary>
    Response body for GET /readings/current: the latest environmental
    sample plus sensor metadata, dew point, and (once wired) affected
    spools/materials and active alerts.
    </summary>
    """

    timestamp: datetime
    temperature_c: float
    relative_humidity_percent: float
    pressure_pa: float
    pressure_kpa: float
    dew_point_c: float
    source: Literal["real", "mock", "manual"]
    sensor: SensorInfo
