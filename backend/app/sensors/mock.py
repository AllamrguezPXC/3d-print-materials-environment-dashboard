import math
import random
import time

from app.core.time import utc_now
from app.schemas.sensor_reading import SensorReadingDTO

TEMP_MIN_C = 20.0
TEMP_MAX_C = 32.0
RH_MIN_PERCENT = 15.0
RH_MAX_PERCENT = 60.0
PRESSURE_MIN_PA = 98_000.0
PRESSURE_MAX_PA = 103_000.0

_DAY_SECONDS = 24 * 60 * 60


class MockSensorReader:
    """
    <summary>
    Simulates a Dracal-class environmental sensor without hardware. Values
    drift via a bounded random walk plus a slow daily sinusoid, with rare
    controlled excursions so alert behavior can be demonstrated. Each
    instance keeps its own state so multiple mock sensors don't move in lockstep.
    </summary>
    """

    def __init__(
        self,
        sensor_serial: str = "MOCK-0001",
        seed_temp_c: float = 24.0,
        seed_rh_percent: float = 35.0,
        seed_pressure_pa: float = 101_000.0,
        rng: random.Random | None = None,
    ) -> None:
        self.sensor_serial = sensor_serial
        self._temp_c = seed_temp_c
        self._rh_percent = seed_rh_percent
        self._pressure_pa = seed_pressure_pa
        self._rng = rng or random.Random()
        self._start_time = time.time()

    def _daily_offset(self, amplitude: float) -> float:
        elapsed = time.time() - self._start_time
        phase = (elapsed % _DAY_SECONDS) / _DAY_SECONDS * 2 * math.pi
        return amplitude * math.sin(phase)

    def _walk(self, current: float, step: float, low: float, high: float, spike_chance: float, spike_amount: float) -> float:
        delta = self._rng.uniform(-step, step)
        if self._rng.random() < spike_chance:
            delta += self._rng.choice([-1, 1]) * spike_amount
        return min(high, max(low, current + delta))

    def read_current(self) -> SensorReadingDTO:
        self._temp_c = self._walk(
            self._temp_c + self._daily_offset(1.5) * 0.05,
            step=0.3,
            low=TEMP_MIN_C,
            high=TEMP_MAX_C,
            spike_chance=0.02,
            spike_amount=3.0,
        )
        self._rh_percent = self._walk(
            self._rh_percent,
            step=1.0,
            low=RH_MIN_PERCENT,
            high=RH_MAX_PERCENT,
            spike_chance=0.03,
            spike_amount=10.0,
        )
        self._pressure_pa = self._walk(
            self._pressure_pa,
            step=50.0,
            low=PRESSURE_MIN_PA,
            high=PRESSURE_MAX_PA,
            spike_chance=0.01,
            spike_amount=500.0,
        )

        return SensorReadingDTO(
            timestamp=utc_now(),
            temperature_c=round(self._temp_c, 2),
            relative_humidity_percent=round(self._rh_percent, 2),
            pressure_pa=round(self._pressure_pa, 1),
            source="mock",
            sensor_serial=self.sensor_serial,
            raw_payload=None,
        )
