from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class SensorReadingDTO(BaseModel):
    """
    <summary>
    Transfer object for a single environmental sample produced by a
    SensorReader implementation (mock or real hardware), before persistence.
    </summary>
    """

    timestamp: datetime
    temperature_c: float
    relative_humidity_percent: float
    pressure_pa: float
    source: Literal["real", "mock", "manual"]
    sensor_serial: str
    raw_payload: str | None = None

    @property
    def pressure_kpa(self) -> float:
        return self.pressure_pa / 1000
