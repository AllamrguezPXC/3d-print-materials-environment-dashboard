from app.core.time import utc_now
from app.schemas.sensor_reading import SensorReadingDTO
from app.sensors.base import SensorParseError

EXPECTED_PRODUCT_PREFIX = "VCP-PTH450"


def parse_vcp_line(line: str, expected_serial: str | None = None) -> SensorReadingDTO:
    """
    Parse a Dracal VCP-PTH450 serial line, e.g.:
    D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5
    """
    raw = line.strip()
    fields = raw.split(",")

    if len(fields) < 10 or fields[0] != "D":
        raise SensorParseError(f"Malformed Dracal VCP line: {raw!r}")

    product = fields[1]
    serial = fields[2]

    if not product.startswith(EXPECTED_PRODUCT_PREFIX):
        raise SensorParseError(f"Unexpected product identifier {product!r} in line: {raw!r}")

    if expected_serial and serial != expected_serial:
        raise SensorParseError(
            f"Sensor serial mismatch: expected {expected_serial!r}, got {serial!r}"
        )

    try:
        pressure_pa = float(fields[4])
        pressure_unit = fields[5]
        temperature_c = float(fields[6])
        temperature_unit = fields[7]
        humidity_percent = float(fields[8])
        humidity_unit = fields[9]
    except (ValueError, IndexError) as exc:
        raise SensorParseError(f"Could not parse numeric channels in line: {raw!r}") from exc

    if pressure_unit != "Pa" or temperature_unit != "C" or humidity_unit != "%":
        raise SensorParseError(f"Unexpected channel units in line: {raw!r}")

    return SensorReadingDTO(
        timestamp=utc_now(),
        temperature_c=temperature_c,
        relative_humidity_percent=humidity_percent,
        pressure_pa=pressure_pa,
        source="real",
        sensor_serial=serial,
        raw_payload=raw,
    )


class DracalVcpSensorReader:
    """
    <summary>
    Reads environmental data from a real Dracal VCP-PTH450-CAL sensor over a
    serial (COM) port. Requires pyserial and a configured port; constructed
    per-row by app.sensors.factory.get_sensor_reader_for_sensor for any
    Sensor row with sensor_type="dracal_vcp".
    </summary>
    """

    def __init__(self, port: str, expected_serial: str | None = None) -> None:
        self.port = port
        self.expected_serial = expected_serial

    def read_current(self) -> SensorReadingDTO:
        import serial  # local import: only required when real hardware mode is active

        with serial.Serial(self.port, baudrate=9600, timeout=2) as ser:
            line = ser.readline().decode("ascii", errors="replace")
        return parse_vcp_line(line, expected_serial=self.expected_serial)
