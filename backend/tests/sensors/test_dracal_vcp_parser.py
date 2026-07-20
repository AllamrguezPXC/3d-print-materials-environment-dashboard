import pytest

from app.sensors.base import SensorParseError
from app.sensors.dracal_vcp import parse_vcp_line

VALID_LINE = "D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5"


def test_parses_valid_line():
    reading = parse_vcp_line(VALID_LINE)

    assert reading.sensor_serial == "E18890"
    assert reading.pressure_pa == 101182.0
    assert reading.temperature_c == 24.8344
    assert reading.relative_humidity_percent == 59.8779
    assert reading.source == "real"
    assert reading.raw_payload == VALID_LINE


def test_rejects_malformed_line():
    with pytest.raises(SensorParseError):
        parse_vcp_line("not,a,valid,dracal,line")


def test_rejects_wrong_serial_when_expected_serial_configured():
    with pytest.raises(SensorParseError):
        parse_vcp_line(VALID_LINE, expected_serial="E27297")


def test_accepts_matching_expected_serial():
    reading = parse_vcp_line(VALID_LINE, expected_serial="E18890")
    assert reading.sensor_serial == "E18890"


def test_rejects_missing_channel():
    truncated = "D,VCP-PTH450,E18890,,101182,Pa,24.8344,C"
    with pytest.raises(SensorParseError):
        parse_vcp_line(truncated)


def test_rejects_non_numeric_channel():
    corrupted = "D,VCP-PTH450,E18890,,NOTANUMBER,Pa,24.8344,C,59.8779,%,*3FB5"
    with pytest.raises(SensorParseError):
        parse_vcp_line(corrupted)
