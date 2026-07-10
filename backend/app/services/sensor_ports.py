"""Serial port discovery and one-off sensor test-reads.

Kept separate from sensor_service.py's CRUD concerns: this module wraps
pyserial's port enumeration and the existing per-sensor reader factory for
an ad-hoc connectivity check. Neither operation touches persisted state --
no Reading row is ever written by a test-read.
"""

from sqlalchemy.orm import Session

from app.schemas.sensor import SensorPortInfo, SensorTestReadResult
from app.sensors.base import SensorParseError
from app.sensors.factory import get_sensor_reader_for_sensor
from app.services.sensor_service import get_sensor_or_404


def list_available_ports() -> list[SensorPortInfo]:
    import serial.tools.list_ports  # local import: only needed when scanning real hardware

    return [
        SensorPortInfo(device=port.device, description=port.description, hwid=port.hwid)
        for port in serial.tools.list_ports.comports()
    ]


def test_read_sensor(session: Session, sensor_id: int) -> SensorTestReadResult:
    sensor = get_sensor_or_404(session, sensor_id)
    try:
        reading = get_sensor_reader_for_sensor(sensor).read_current()
    except (SensorParseError, OSError, ValueError) as exc:
        return SensorTestReadResult(success=False, error=str(exc))

    return SensorTestReadResult(
        success=True,
        temperature_c=reading.temperature_c,
        relative_humidity_percent=reading.relative_humidity_percent,
        pressure_pa=reading.pressure_pa,
        source=reading.source,
    )
