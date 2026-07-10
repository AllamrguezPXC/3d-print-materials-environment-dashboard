def test_post_readings_with_empty_body_captures_from_all_active_sensors(client):
    from app.db.session import SessionLocal
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        active_count = session.query(Sensor).filter_by(is_active=True).count()

    response = client.post("/readings")

    assert response.status_code == 200
    body = response.json()
    assert "readings" in body
    assert len(body["readings"]) == active_count
    # The real Dracal sensor has no hardware attached here, so its result
    # carries an error; the mock sensors must still have persisted readings.
    successes = [r for r in body["readings"] if r["error"] is None]
    assert len(successes) >= 1
    for result in successes:
        assert isinstance(result["reading"]["id"], int)


def test_post_readings_with_empty_body_and_zero_active_sensors_returns_empty_list_no_synthesized_data(client):
    from app.db.session import SessionLocal
    from app.models.reading import Reading
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        original_states = {s.id: s.is_active for s in session.query(Sensor).all()}
        session.query(Sensor).update({Sensor.is_active: False})
        session.commit()
        reading_count_before = session.query(Reading).count()

    try:
        response = client.post("/readings")
        assert response.status_code == 200
        body = response.json()
        assert body["readings"] == []
        assert body["message"] == "No active sensors configured."

        with SessionLocal() as session:
            assert session.query(Reading).count() == reading_count_before
    finally:
        with SessionLocal() as session:
            for sensor_id, was_active in original_states.items():
                session.query(Sensor).filter_by(id=sensor_id).update({Sensor.is_active: was_active})
            session.commit()


def test_post_readings_persists_one_row_per_active_sensor(client):
    from app.db.session import SessionLocal
    from app.models.reading import Reading
    from app.models.sensor import Sensor

    with SessionLocal() as session:
        active_count = session.query(Sensor).filter_by(is_active=True).count()
        reading_count_before = session.query(Reading).count()

    response = client.post("/readings")
    assert response.status_code == 200
    successes = [r for r in response.json()["readings"] if r["error"] is None]

    with SessionLocal() as session:
        reading_count_after = session.query(Reading).count()

    assert reading_count_after - reading_count_before == len(successes)
    assert len(successes) <= active_count


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
