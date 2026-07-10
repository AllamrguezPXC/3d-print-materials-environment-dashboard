import subprocess

from app.core.config import get_settings
from app.core.time import utc_now
from app.schemas.sensor_reading import SensorReadingDTO
from app.sensors.base import SensorParseError

# `dracal-usb-get -i 0,1,2 -s <serial>` prints "pressure_kPa, temperature_C, rh_percent".
_PRESSURE_INDEX = 0
_TEMPERATURE_INDEX = 1
_HUMIDITY_INDEX = 2


class DracalCliSensorReader:
    """
    <summary>
    Reads a Dracal USB sensor via the vendor's `dracal-usb-get` CLI tool
    (native USB) instead of a virtual COM port. Some Dracal devices' Windows
    driver binds to the generic USB class rather than CDC/VCP, so no serial
    port is ever exposed for DracalVcpSensorReader/pyserial to open -- this
    reader targets the same physical hardware over Dracal's own interface.
    </summary>
    """

    def __init__(self, serial_number: str, executable: str | None = None) -> None:
        self.serial_number = serial_number
        self.executable = executable or get_settings().dracal_cli_executable

    def read_current(self) -> SensorReadingDTO:
        try:
            raw = (
                subprocess.check_output(
                    [self.executable, "-i", "0,1,2", "-s", self.serial_number],
                    stderr=subprocess.STDOUT,
                    timeout=5,
                )
                .decode("utf-8")
                .strip()
            )
        except subprocess.CalledProcessError as exc:
            raise SensorParseError(
                f"dracal-usb-get failed for serial {self.serial_number!r}: "
                f"{exc.output.decode('utf-8', errors='replace').strip()!r}"
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise SensorParseError(
                f"dracal-usb-get timed out for serial {self.serial_number!r}"
            ) from exc

        fields = [f.strip() for f in raw.split(",")]
        if len(fields) < 3:
            raise SensorParseError(f"Unexpected dracal-usb-get output: {raw!r}")

        try:
            pressure_kpa = float(fields[_PRESSURE_INDEX])
            temperature_c = float(fields[_TEMPERATURE_INDEX])
            relative_humidity_percent = float(fields[_HUMIDITY_INDEX])
        except ValueError as exc:
            raise SensorParseError(f"Could not parse dracal-usb-get output: {raw!r}") from exc

        return SensorReadingDTO(
            timestamp=utc_now(),
            temperature_c=temperature_c,
            relative_humidity_percent=relative_humidity_percent,
            pressure_pa=pressure_kpa * 1000,
            source="real",
            sensor_serial=self.serial_number,
            raw_payload=raw,
        )
