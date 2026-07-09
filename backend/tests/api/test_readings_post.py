def test_post_readings_with_empty_body_captures_from_default_sensor(client):
    response = client.post("/readings")

    assert response.status_code == 200
    body = response.json()
    assert body["reading"]["source"] == "mock"
    assert "alerts" in body
    assert isinstance(body["reading"]["id"], int)


def test_post_readings_with_manual_payload_persists_it(client):
    payload = {
        "temperature_c": 25.0,
        "relative_humidity_percent": 40.0,
        "pressure_pa": 101000.0,
        "source": "manual",
    }
    response = client.post("/readings", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["reading"]["temperature_c"] == 25.0
    assert body["reading"]["source"] == "manual"


def test_post_readings_manual_payload_requires_pressure(client):
    payload = {"temperature_c": 25.0, "relative_humidity_percent": 40.0}
    response = client.post("/readings", json=payload)

    assert response.status_code == 422


def test_post_readings_triggers_critical_humidity_alert_for_assigned_spool(client):
    # The seed data assigns a PLA spool to "AMS Slot 1 - A1 mini #1" (ideal RH
    # max 40%, critical RH max 60%). Post a manual reading with humidity far
    # above that critical threshold and confirm a humidity alert is raised.
    from app.db.session import SessionLocal
    from app.models.location import Location

    with SessionLocal() as session:
        location = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
        assert location is not None, "expected seeded demo location to exist"
        location_id = location.id

    payload = {
        "location_id": location_id,
        "temperature_c": 24.0,
        "relative_humidity_percent": 90.0,
        "pressure_pa": 101000.0,
        "source": "manual",
    }
    response = client.post("/readings", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert any(alert["metric"] == "humidity" for alert in body["alerts"])
