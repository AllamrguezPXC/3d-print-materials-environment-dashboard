from app.db.session import SessionLocal
from app.models.location import Location


def _trigger_humidity_alert(client) -> None:
    # Mirrors tests/api/test_readings_post.py: the seeded PLA spool is
    # assigned to "AMS Slot 1 - A1 mini #1" (critical RH max 60%).
    with SessionLocal() as session:
        location = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
        assert location is not None
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
    assert any(a["metric"] == "humidity" for a in response.json()["alerts"])


def test_list_alerts_returns_200(client):
    response = client.get("/alerts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_alerts_after_triggering_one(client):
    _trigger_humidity_alert(client)

    response = client.get("/alerts")
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert any(a["metric"] == "humidity" and a["is_active"] for a in body)


def test_list_alerts_filters_by_is_active(client):
    _trigger_humidity_alert(client)

    response = client.get("/alerts", params={"is_active": True})
    assert response.status_code == 200
    assert all(a["is_active"] is True for a in response.json())


def test_resolve_alert_happy_path(client):
    _trigger_humidity_alert(client)

    alerts = client.get("/alerts", params={"is_active": True}).json()
    humidity_alert = next(a for a in alerts if a["metric"] == "humidity")

    response = client.patch(f"/alerts/{humidity_alert['id']}/resolve")
    assert response.status_code == 200
    body = response.json()
    assert body["alert"]["is_active"] is False
    assert body["alert"]["resolved_at"] is not None


def test_resolve_alert_404_for_missing_id(client):
    response = client.patch("/alerts/999999/resolve")
    assert response.status_code == 404
