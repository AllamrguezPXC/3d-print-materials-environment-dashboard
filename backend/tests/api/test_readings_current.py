def test_get_current_reading_returns_sensors_list_shape(client):
    response = client.get("/readings/current")

    assert response.status_code == 200
    body = response.json()

    assert isinstance(body["sensors"], list)
    assert len(body["sensors"]) > 0

    entry = body["sensors"][0]
    assert "sensor" in entry
    assert "id" in entry["sensor"]
    assert "serial_number" in entry["sensor"]
    assert "error" in entry
    assert "source" in entry


def test_get_current_reading_includes_location_and_affected_spools_for_relevant_sensor(client):
    """Requirements.md section 12.1: each entry must include location info and
    affected materials/spools, not just the raw reading."""
    from app.db.session import SessionLocal
    from app.models.location import Location
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        sensor = session.query(Sensor).filter_by(serial_number="MOCK-0001").first()
        original_location_id = sensor.location_id
        ams_location = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
        sensor.location_id = ams_location.id
        session.commit()
        sensor_id = sensor.id

    try:
        response = client.get("/readings/current")
        assert response.status_code == 200
        body = response.json()

        entry = next(e for e in body["sensors"] if e["sensor"]["id"] == sensor_id)
        assert entry["location"]["name"] == "AMS Slot 1 - A1 mini #1"
        assert entry["location_id"] == ams_location.id
        assert len(entry["affected_spools"]) >= 1
        assert entry["affected_spools"][0]["material_profile_name"] == "PLA"
    finally:
        with SessionLocal() as session:
            sensor = session.query(Sensor).filter_by(serial_number="MOCK-0001").first()
            sensor.location_id = original_location_id
            session.commit()


def test_get_current_reading_returns_empty_list_and_message_when_all_sensors_inactive(client):
    from app.db.session import SessionLocal
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        original_states = {s.id: s.is_active for s in session.query(Sensor).all()}
        session.query(Sensor).update({Sensor.is_active: False})
        session.commit()

    try:
        response = client.get("/readings/current")
        assert response.status_code == 200
        body = response.json()
        assert body["sensors"] == []
        assert body["message"] == "No active sensors configured."
    finally:
        with SessionLocal() as session:
            for sensor_id, was_active in original_states.items():
                session.query(Sensor).filter_by(id=sensor_id).update({Sensor.is_active: was_active})
            session.commit()


def test_get_current_reading_real_sensor_error_does_not_prevent_mock_entries(client):
    # The seeded real Dracal sensor (serial E27297) has no hardware attached
    # in this environment -- its entry should carry a non-null `error` while
    # the mock sensors' entries still succeed with real numeric readings.
    response = client.get("/readings/current")
    assert response.status_code == 200
    body = response.json()

    real_entry = next(e for e in body["sensors"] if e["sensor"]["serial_number"] == "E27297")
    assert real_entry["error"] is not None
    assert real_entry["temperature_c"] is None

    mock_entries = [e for e in body["sensors"] if e["sensor"]["sensor_type"] == "mock"]
    assert len(mock_entries) > 0
    for entry in mock_entries:
        assert entry["error"] is None
        assert isinstance(entry["temperature_c"], (int, float))
