import random

from app.sensors.mock import (
    PRESSURE_MAX_PA,
    PRESSURE_MIN_PA,
    RH_MAX_PERCENT,
    RH_MIN_PERCENT,
    TEMP_MAX_C,
    TEMP_MIN_C,
    MockSensorReader,
)


def test_mock_reading_has_expected_shape():
    reader = MockSensorReader(rng=random.Random(1))
    reading = reader.read_current()

    assert reading.source == "mock"
    assert reading.sensor_serial == "MOCK-0001"
    assert reading.timestamp is not None


def test_mock_readings_stay_within_configured_bounds():
    reader = MockSensorReader(rng=random.Random(42))

    for _ in range(500):
        reading = reader.read_current()
        assert TEMP_MIN_C <= reading.temperature_c <= TEMP_MAX_C
        assert RH_MIN_PERCENT <= reading.relative_humidity_percent <= RH_MAX_PERCENT
        assert PRESSURE_MIN_PA <= reading.pressure_pa <= PRESSURE_MAX_PA


def test_mock_readings_drift_instead_of_jumping_randomly():
    reader = MockSensorReader(rng=random.Random(7))

    previous = reader.read_current()
    max_jump_seen = 0.0
    for _ in range(200):
        current = reader.read_current()
        max_jump_seen = max(max_jump_seen, abs(current.temperature_c - previous.temperature_c))
        previous = current

    # A pure random walk within [-3, +3] spike bound should never exceed it per step.
    assert max_jump_seen <= 3.5
