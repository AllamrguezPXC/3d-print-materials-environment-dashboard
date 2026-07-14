from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.repositories.reading_repository import save_reading
from app.services.reading_service import get_readings_history


def test_hourly_dew_point_average_ignores_rows_with_no_dew_point(client):
    """Regression test: the average used to divide by every reading in the
    bucket (`len(bucket)`) instead of only the ones with a non-null
    dew_point_c, silently biasing the average toward zero whenever any row
    in the hour lacked one. No current write path leaves dew_point_c null
    (compute_dew_point_c always returns a float), so this is only
    reachable by inserting directly, as done here."""
    with SessionLocal() as session:
        from app.models.sensor import Sensor

        sensor = session.query(Sensor).filter_by(serial_number="MOCK-0001").first()
        assert sensor is not None

        hour_start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        save_reading(
            session,
            sensor_id=sensor.id,
            location_id=None,
            timestamp=hour_start + timedelta(minutes=5),
            temperature_c=20.0,
            relative_humidity_percent=30.0,
            pressure_pa=100000.0,
            pressure_kpa=100.0,
            dew_point_c=10.0,
            source="mock",
            raw_payload=None,
        )
        save_reading(
            session,
            sensor_id=sensor.id,
            location_id=None,
            timestamp=hour_start + timedelta(minutes=45),
            temperature_c=22.0,
            relative_humidity_percent=32.0,
            pressure_pa=100500.0,
            pressure_kpa=100.5,
            dew_point_c=None,
            source="mock",
            raw_payload=None,
        )
        session.commit()

        _, hourly = get_readings_history(
            session,
            from_dt=hour_start,
            to_dt=hour_start + timedelta(hours=1),
            sensor_id=None,
            location_id=None,
            aggregate="hour",
        )

    assert len(hourly) == 1
    # Average of the ONE row that has a dew point (10.0), not 10.0 / 2 = 5.0.
    assert hourly[0].dew_point_c == 10.0
