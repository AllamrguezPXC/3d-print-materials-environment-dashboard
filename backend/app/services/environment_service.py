import math

from app.core.config import Settings
from app.schemas.reading import CurrentReadingResponse, SensorInfo
from app.sensors.factory import get_sensor_reader


def compute_dew_point_c(temperature_c: float, relative_humidity_percent: float) -> float:
    """Magnus formula approximation of dew point, in degrees Celsius."""
    a, b = 17.62, 243.12
    rh_fraction = max(relative_humidity_percent, 0.1) / 100
    gamma = (a * temperature_c) / (b + temperature_c) + math.log(rh_fraction)
    return round((b * gamma) / (a - gamma), 2)


def build_current_reading(settings: Settings) -> CurrentReadingResponse:
    reader = get_sensor_reader(settings)
    reading = reader.read_current()

    return CurrentReadingResponse(
        timestamp=reading.timestamp,
        temperature_c=reading.temperature_c,
        relative_humidity_percent=reading.relative_humidity_percent,
        pressure_pa=reading.pressure_pa,
        pressure_kpa=reading.pressure_kpa,
        dew_point_c=compute_dew_point_c(reading.temperature_c, reading.relative_humidity_percent),
        source=reading.source,
        sensor=SensorInfo(serial_number=reading.sensor_serial, sensor_type=reading.source),
    )
