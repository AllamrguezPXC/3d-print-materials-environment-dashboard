import hashlib
import random

from app.models.sensor import Sensor
from app.sensors.base import SensorReader
from app.sensors.dracal_cli import DracalCliSensorReader
from app.sensors.dracal_vcp import DracalVcpSensorReader
from app.sensors.mock import MockSensorReader

# Cached per (id, sensor_type, serial_number, port) so a mock reader's drift
# state survives repeated polls, while an edit to any of those fields via
# PATCH /sensors/{id} naturally produces a fresh cache key -> a fresh reader.
_reader_cache: dict[tuple, SensorReader] = {}


def _seed_for_serial(serial_number: str) -> int:
    """Deterministic, reproducible-across-restarts seed derived from the
    sensor's own serial number. Never Python's builtin hash() -- that's
    salted per-process (PYTHONHASHSEED) and would make mock drift
    non-reproducible between runs.
    """
    return int(hashlib.sha256(serial_number.encode()).hexdigest()[:16], 16)


def _build_reader(sensor: Sensor) -> SensorReader:
    if sensor.sensor_type == "dracal_vcp":
        return DracalVcpSensorReader(port=sensor.port, expected_serial=sensor.serial_number)

    if sensor.sensor_type == "dracal_cli":
        return DracalCliSensorReader(serial_number=sensor.serial_number)

    if sensor.sensor_type == "mock":
        seed = _seed_for_serial(sensor.serial_number)
        return MockSensorReader(
            sensor_serial=sensor.serial_number,
            seed_temp_c=24.0 + (seed % 7) - 3,
            seed_rh_percent=35.0 + (seed % 11) - 5,
            seed_pressure_pa=101_000.0 + (seed % 501) - 250,
            rng=random.Random(seed),
        )

    raise ValueError(f"Unsupported sensor_type: {sensor.sensor_type!r}")


def get_sensor_reader_for_sensor(sensor: Sensor) -> SensorReader:
    key = (sensor.id, sensor.sensor_type, sensor.serial_number, sensor.port)
    reader = _reader_cache.get(key)
    if reader is None:
        reader = _build_reader(sensor)
        _reader_cache[key] = reader
    return reader
