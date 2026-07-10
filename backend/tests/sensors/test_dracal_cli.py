import subprocess

import pytest

from app.sensors.base import SensorParseError
from app.sensors.dracal_cli import DracalCliSensorReader


def test_read_current_parses_successful_output(monkeypatch):
    def fake_check_output(cmd, **kwargs):
        assert cmd == ["dracal-usb-get", "-i", "0,1,2", "-s", "E27297"]
        return b"101.04, 24.16, 53.52\n"

    monkeypatch.setattr(subprocess, "check_output", fake_check_output)

    reader = DracalCliSensorReader(serial_number="E27297", executable="dracal-usb-get")
    reading = reader.read_current()

    assert reading.source == "real"
    assert reading.sensor_serial == "E27297"
    assert reading.pressure_pa == pytest.approx(101_040.0)
    assert reading.temperature_c == pytest.approx(24.16)
    assert reading.relative_humidity_percent == pytest.approx(53.52)


def test_read_current_raises_sensor_parse_error_on_called_process_error(monkeypatch):
    def fake_check_output(cmd, **kwargs):
        raise subprocess.CalledProcessError(returncode=1, cmd=cmd, output=b"dracal-usb-get error")

    monkeypatch.setattr(subprocess, "check_output", fake_check_output)

    reader = DracalCliSensorReader(serial_number="E27297")
    with pytest.raises(SensorParseError):
        reader.read_current()


def test_read_current_raises_sensor_parse_error_on_timeout(monkeypatch):
    def fake_check_output(cmd, **kwargs):
        raise subprocess.TimeoutExpired(cmd=cmd, timeout=5)

    monkeypatch.setattr(subprocess, "check_output", fake_check_output)

    reader = DracalCliSensorReader(serial_number="E27297")
    with pytest.raises(SensorParseError):
        reader.read_current()


def test_read_current_raises_sensor_parse_error_on_malformed_output(monkeypatch):
    monkeypatch.setattr(subprocess, "check_output", lambda cmd, **kwargs: b"101.04, 24.16\n")

    reader = DracalCliSensorReader(serial_number="E27297")
    with pytest.raises(SensorParseError):
        reader.read_current()


def test_read_current_raises_sensor_parse_error_on_non_numeric_field(monkeypatch):
    monkeypatch.setattr(
        subprocess, "check_output", lambda cmd, **kwargs: b"101.04, ProbeDisconnected, 53.52\n"
    )

    reader = DracalCliSensorReader(serial_number="E27297")
    with pytest.raises(SensorParseError):
        reader.read_current()


def test_read_current_uses_missing_executable_as_oserror(monkeypatch):
    def fake_check_output(cmd, **kwargs):
        raise FileNotFoundError("dracal-usb-get not found")

    monkeypatch.setattr(subprocess, "check_output", fake_check_output)

    reader = DracalCliSensorReader(serial_number="E27297")
    with pytest.raises(OSError):
        reader.read_current()
