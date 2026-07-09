from app.core.config import Settings
from app.sensors.base import SensorReader
from app.sensors.dracal_vcp import DracalVcpSensorReader
from app.sensors.mock import MockSensorReader

_mock_reader_cache: MockSensorReader | None = None


def get_sensor_reader(settings: Settings) -> SensorReader:
    if settings.sensor_mode == "dracal_vcp":
        return DracalVcpSensorReader(
            port=settings.dracal_vcp_port,
            expected_serial=settings.dracal_serial_number,
        )

    if settings.sensor_mode == "mock":
        global _mock_reader_cache
        if _mock_reader_cache is None:
            _mock_reader_cache = MockSensorReader(sensor_serial=settings.dracal_serial_number)
        return _mock_reader_cache

    raise ValueError(f"Unsupported SENSOR_MODE: {settings.sensor_mode!r}")
