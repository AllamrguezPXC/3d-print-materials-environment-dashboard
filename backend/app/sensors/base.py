from typing import Protocol

from app.schemas.sensor_reading import SensorReadingDTO


class SensorReader(Protocol):
    def read_current(self) -> SensorReadingDTO: ...


class SensorParseError(Exception):
    """Raised when a raw sensor payload cannot be parsed into a SensorReadingDTO."""
