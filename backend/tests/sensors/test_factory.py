from app.models.sensor import Sensor
from app.sensors.dracal_vcp import DracalVcpSensorReader
from app.sensors.factory import get_sensor_reader_for_sensor
from app.sensors.mock import MockSensorReader


def _sensor(**overrides) -> Sensor:
    defaults = dict(
        id=1,
        name="Test Sensor",
        model="mock",
        serial_number="MOCK-0001",
        sensor_type="mock",
        port=None,
        is_active=True,
        location_id=None,
    )
    defaults.update(overrides)
    return Sensor(**defaults)


def test_get_sensor_reader_for_sensor_mock_returns_mock_reader():
    reader = get_sensor_reader_for_sensor(_sensor())
    assert isinstance(reader, MockSensorReader)
    assert reader.sensor_serial == "MOCK-0001"


def test_get_sensor_reader_for_sensor_dracal_returns_dracal_reader_with_row_port_and_serial():
    sensor = _sensor(id=2, sensor_type="dracal_vcp", serial_number="E25877", port="COM7")
    reader = get_sensor_reader_for_sensor(sensor)
    assert isinstance(reader, DracalVcpSensorReader)
    assert reader.port == "COM7"
    assert reader.expected_serial == "E25877"


def test_get_sensor_reader_for_sensor_unknown_type_raises_value_error():
    sensor = _sensor(id=3, sensor_type="bluetooth_widget")
    try:
        get_sensor_reader_for_sensor(sensor)
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "bluetooth_widget" in str(exc)


def test_two_mock_sensors_produce_independent_reading_sequences():
    sensor_a = _sensor(id=101, serial_number="MOCK-0101")
    sensor_b = _sensor(id=102, serial_number="MOCK-0102")

    reader_a = get_sensor_reader_for_sensor(sensor_a)
    reader_b = get_sensor_reader_for_sensor(sensor_b)

    readings_a = [reader_a.read_current().temperature_c for _ in range(20)]
    readings_b = [reader_b.read_current().temperature_c for _ in range(20)]

    assert readings_a != readings_b


def test_same_sensor_row_reused_returns_cached_reader_instance():
    sensor = _sensor(id=201, serial_number="MOCK-0201")
    reader_first = get_sensor_reader_for_sensor(sensor)
    reader_second = get_sensor_reader_for_sensor(sensor)
    assert reader_first is reader_second


def test_reader_cache_invalidated_when_sensor_type_or_port_changes():
    sensor = _sensor(id=301, serial_number="MOCK-0301")
    original_reader = get_sensor_reader_for_sensor(sensor)

    sensor.sensor_type = "dracal_vcp"
    sensor.serial_number = "E30301"
    sensor.port = "COM9"
    new_reader = get_sensor_reader_for_sensor(sensor)

    assert new_reader is not original_reader
    assert isinstance(new_reader, DracalVcpSensorReader)
