def test_list_sensors_includes_seeded_real_sensor(client):
    response = client.get("/sensors")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert any(s["serial_number"] == "E25877" for s in body)


def test_create_and_fetch_sensor(client):
    payload = {
        "name": "Test Sensor",
        "model": "VCP-PTH450-CAL",
        "serial_number": "TEST-SENSOR-0001",
        "sensor_type": "mock",
        "is_active": True,
    }
    create_response = client.post("/sensors", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)
    assert created["serial_number"] == "TEST-SENSOR-0001"

    get_response = client.get(f"/sensors/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Test Sensor"


def test_get_sensor_404_for_missing_id(client):
    response = client.get("/sensors/999999")
    assert response.status_code == 404


def test_patch_sensor_updates_fields(client):
    payload = {
        "name": "Patchable Sensor",
        "model": "VCP-PTH450-CAL",
        "serial_number": "TEST-SENSOR-0002",
        "sensor_type": "mock",
    }
    created = client.post("/sensors", json=payload).json()

    response = client.patch(f"/sensors/{created['id']}", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_delete_sensor_happy_path(client):
    payload = {
        "name": "Deletable Sensor",
        "model": "VCP-PTH450-CAL",
        "serial_number": "TEST-SENSOR-0003",
        "sensor_type": "mock",
    }
    created = client.post("/sensors", json=payload).json()

    delete_response = client.delete(f"/sensors/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/sensors/{created['id']}")
    assert get_response.status_code == 404
