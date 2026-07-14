"""Background auto-capture loop.

`POST /readings` (either a manual payload or `capture_and_persist_all_active_sensors`) is the only
thing that ever writes `Reading`/`Alert` rows -- previously that only happened when someone clicked
"Capture reading now" on /history. The Dashboard's live polling (`GET /readings/current`) computes
everything in memory and never persists, so `/alerts` history stayed empty indefinitely unless a
human manually triggered a capture. This loop runs for the lifetime of the app (started from
app.main's lifespan) and does that automatically, so real history accumulates on its own.
"""

import asyncio
import logging

from app.db.session import SessionLocal
from app.services.reading_service import capture_and_persist_all_active_sensors

logger = logging.getLogger(__name__)


async def run_auto_capture_loop(interval_seconds: float) -> None:
    """Sleeps `interval_seconds`, captures+persists every active sensor's
    current reading, repeats forever. A single failed tick (e.g. a physical
    sensor briefly disconnected) is logged and skipped rather than crashing
    the loop, so one bad tick doesn't stop the app's automatic history for
    every other sensor.
    """
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            with SessionLocal() as session:
                capture_and_persist_all_active_sensors(session)
        except Exception:  # noqa: BLE001 - a bad tick must never kill the loop
            logger.exception("Auto-capture tick failed")
