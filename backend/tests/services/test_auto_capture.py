import asyncio
from contextlib import suppress

from app.db.session import SessionLocal
from app.models.reading import Reading
from app.services import auto_capture


async def _run_briefly(interval_seconds: float, timeout: float) -> None:
    with suppress(asyncio.TimeoutError):
        await asyncio.wait_for(auto_capture.run_auto_capture_loop(interval_seconds), timeout=timeout)


def test_run_auto_capture_loop_persists_readings_each_tick(client):
    with SessionLocal() as session:
        count_before = session.query(Reading).count()

    asyncio.run(_run_briefly(interval_seconds=0.01, timeout=0.05))

    with SessionLocal() as session:
        count_after = session.query(Reading).count()
    assert count_after > count_before


def test_run_auto_capture_loop_survives_a_failing_tick(client, monkeypatch):
    def _boom(_session):
        raise RuntimeError("simulated sensor failure")

    monkeypatch.setattr(auto_capture, "capture_and_persist_all_active_sensors", _boom)

    # Must not raise -- a failed tick is logged and the loop keeps going,
    # so the timeout (not an exception) is what ends this test.
    asyncio.run(_run_briefly(interval_seconds=0.01, timeout=0.05))
