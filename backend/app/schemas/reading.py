from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.alert import AlertRead

# Physically plausible bounds for manual/mock POST /readings payloads.
# Intentionally wider than the mock sensor's normal drift range
# (Requirements.md section 10.3) so material-profile warning/critical demo
# values (e.g. RH up to ~90%) remain valid, while still rejecting nonsensical
# input (e.g. RH=-5000 or temperature_c=-9999) that could otherwise crash the
# Magnus-formula dew point calculation (division by zero near -243.12C) or
# silently corrupt history charts. See evidence/security-review.md.
TEMPERATURE_C_MIN = -40.0
TEMPERATURE_C_MAX = 85.0
RELATIVE_HUMIDITY_MIN = 0.0
RELATIVE_HUMIDITY_MAX = 100.0
PRESSURE_PA_MIN = 30_000.0
PRESSURE_PA_MAX = 120_000.0
PRESSURE_KPA_MIN = PRESSURE_PA_MIN / 1000
PRESSURE_KPA_MAX = PRESSURE_PA_MAX / 1000


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
    location_id: int | None = None
    alerts: list[AlertRead] = []


class ReadingCreate(BaseModel):
    """Optional manual/mock reading payload for POST /readings.

    When the request body is empty, POST /readings reads from the default
    configured sensor instead of using this schema.
    """

    sensor_id: int | None = None
    location_id: int | None = None
    timestamp: datetime | None = None
    temperature_c: float = Field(ge=TEMPERATURE_C_MIN, le=TEMPERATURE_C_MAX)
    relative_humidity_percent: float = Field(ge=RELATIVE_HUMIDITY_MIN, le=RELATIVE_HUMIDITY_MAX)
    pressure_pa: float | None = Field(default=None, ge=PRESSURE_PA_MIN, le=PRESSURE_PA_MAX)
    pressure_kpa: float | None = Field(default=None, ge=PRESSURE_KPA_MIN, le=PRESSURE_KPA_MAX)
    source: Literal["mock", "manual"] = "manual"

    @model_validator(mode="after")
    def _require_pressure(self) -> "ReadingCreate":
        if self.pressure_pa is None and self.pressure_kpa is None:
            raise ValueError("Either pressure_pa or pressure_kpa is required.")
        if self.pressure_pa is None:
            self.pressure_pa = self.pressure_kpa * 1000
        if self.pressure_kpa is None:
            self.pressure_kpa = self.pressure_pa / 1000
        return self


class ReadingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sensor_id: int
    location_id: int | None
    timestamp: datetime
    temperature_c: float
    relative_humidity_percent: float
    pressure_pa: float
    pressure_kpa: float
    dew_point_c: float | None
    source: str


class ReadingCreateResponse(BaseModel):
    reading: ReadingRead
    alerts: list[AlertRead]


class HourlyAggregate(BaseModel):
    hour: datetime
    temperature_c: float
    relative_humidity_percent: float
    pressure_pa: float
    dew_point_c: float | None
    sample_count: int


class ReadingsHistoryResponse(BaseModel):
    readings: list[ReadingRead] = []
    hourly: list[HourlyAggregate] = []
