from app.db.session import SessionLocal
from app.models.sensor import Sensor
from app.services.environment_service import build_current_readings


def test_build_current_readings_returns_empty_list_with_message_when_no_active_sensors(client):
    with SessionLocal() as session:
        original_states = {s.id: s.is_active for s in session.query(Sensor).all()}
        session.query(Sensor).update({Sensor.is_active: False})
        session.commit()

        try:
            result = build_current_readings(session)
            assert result.sensors == []
            assert result.message == "No active sensors configured."
        finally:
            for sensor_id, was_active in original_states.items():
                session.query(Sensor).filter_by(id=sensor_id).update({Sensor.is_active: was_active})
            session.commit()


def test_build_current_readings_returns_one_entry_per_active_sensor(client):
    with SessionLocal() as session:
        active_count = (
            session.query(Sensor).filter_by(is_active=True).filter(Sensor.deleted_at.is_(None)).count()
        )
        result = build_current_readings(session)
        assert len(result.sensors) == active_count
        assert result.message is None


def test_build_current_readings_excludes_inactive_sensors(client):
    with SessionLocal() as session:
        mock_sensor = session.query(Sensor).filter_by(serial_number="MOCK-0001").first()
        assert mock_sensor is not None
        original_active = mock_sensor.is_active
        mock_sensor.is_active = False
        session.commit()

        try:
            result = build_current_readings(session)
            assert all(entry.sensor.id != mock_sensor.id for entry in result.sensors)
        finally:
            session.query(Sensor).filter_by(id=mock_sensor.id).update({Sensor.is_active: original_active})
            session.commit()


def test_build_current_readings_isolates_per_sensor_read_error(client):
    # The seeded real Dracal sensor (serial E27297, port COM3) has no actual
    # hardware attached in CI/dev -- reading it raises a SerialException
    # (an OSError subclass), which must be captured on its own entry without
    # preventing the mock sensors' entries from succeeding.
    with SessionLocal() as session:
        result = build_current_readings(session)

        real_entry = next(e for e in result.sensors if e.sensor.serial_number == "E27297")
        assert real_entry.error is not None
        assert real_entry.temperature_c is None

        mock_entries = [e for e in result.sensors if e.sensor.sensor_type == "mock"]
        assert len(mock_entries) > 0
        for entry in mock_entries:
            assert entry.error is None
            assert entry.temperature_c is not None


def test_build_current_readings_computes_location_and_affected_spools_and_alerts_per_sensor(client):
    with SessionLocal() as session:
        mock_sensor = session.query(Sensor).filter_by(serial_number="MOCK-0001").first()
        assert mock_sensor.location_id is not None, "expected seeded mock sensor to have a location"

        result = build_current_readings(session)
        entry = next(e for e in result.sensors if e.sensor.id == mock_sensor.id)

        assert entry.location is not None
        assert entry.location.id == mock_sensor.location_id
        assert isinstance(entry.affected_spools, list)
        assert isinstance(entry.alerts, list)
