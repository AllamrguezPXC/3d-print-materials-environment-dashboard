def test_get_current_reading_returns_mock_data(client):
    response = client.get("/readings/current")

    assert response.status_code == 200
    body = response.json()

    assert isinstance(body["temperature_c"], (int, float))
    assert isinstance(body["relative_humidity_percent"], (int, float))
    assert "pressure_pa" in body or "pressure_kpa" in body
    assert "timestamp" in body
    assert body["source"] == "mock"
    assert "sensor" in body
    assert body["sensor"]["serial_number"] == "E25877"


def test_get_current_reading_includes_location_and_affected_spools(client):
    """Requirements.md section 12.1: response must include location info and
    affected materials/spools, not just the raw reading."""
    from app.db.session import SessionLocal
    from app.models.location import Location
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        sensor = session.query(Sensor).filter_by(serial_number="E25877").first()
        original_location_id = sensor.location_id
        ams_location = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
        sensor.location_id = ams_location.id
        session.commit()

    try:
        response = client.get("/readings/current")
        assert response.status_code == 200
        body = response.json()

        assert body["location"]["name"] == "AMS Slot 1 - A1 mini #1"
        assert body["location_id"] == ams_location.id
        assert len(body["affected_spools"]) >= 1
        assert body["affected_spools"][0]["material_profile_name"] == "PLA"
    finally:
        with SessionLocal() as session:
            sensor = session.query(Sensor).filter_by(serial_number="E25877").first()
            sensor.location_id = original_location_id
            session.commit()
