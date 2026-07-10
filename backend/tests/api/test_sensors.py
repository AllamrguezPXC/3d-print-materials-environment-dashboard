from app.sensors.base import SensorParseError


def test_list_sensor_ports_returns_detected_ports(client, monkeypatch):
    class FakePort:
        def __init__(self, device, description, hwid):
            self.device = device
            self.description = description
            self.hwid = hwid

    def fake_comports():
        return [FakePort("COM7", "USB Serial Device", "USB VID:PID=0403:6001")]

    import serial.tools.list_ports as list_ports_module

    monkeypatch.setattr(list_ports_module, "comports", fake_comports)

    response = client.get("/sensors/ports")
    assert response.status_code == 200
    assert response.json() == [
        {"device": "COM7", "description": "USB Serial Device", "hwid": "USB VID:PID=0403:6001"}
    ]


def test_test_read_succeeds_for_mock_sensor(client):
    mock_sensor = next(s for s in client.get("/sensors").json() if s["serial_number"] == "MOCK-0001")

    response = client.post(f"/sensors/{mock_sensor['id']}/test-read")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["error"] is None
    assert isinstance(body["temperature_c"], (int, float))


def test_test_read_returns_controlled_error_without_crashing(client, monkeypatch):
    real_sensor = next(s for s in client.get("/sensors").json() if s["serial_number"] == "E25877")

    class FailingReader:
        def read_current(self):
            raise SensorParseError("Simulated hardware failure")

    monkeypatch.setattr(
        "app.services.sensor_ports.get_sensor_reader_for_sensor", lambda sensor: FailingReader()
    )

    response = client.post(f"/sensors/{real_sensor['id']}/test-read")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "Simulated hardware failure"


def test_test_read_404_for_missing_sensor(client):
    response = client.post("/sensors/999999/test-read")
    assert response.status_code == 404


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
        "serial_number": "MOCK-TEST-0001",
        "sensor_type": "mock",
        "is_active": True,
    }
    create_response = client.post("/sensors", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)
    assert created["serial_number"] == "MOCK-TEST-0001"

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
        "serial_number": "MOCK-TEST-0002",
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
        "serial_number": "MOCK-TEST-0003",
        "sensor_type": "mock",
    }
    created = client.post("/sensors", json=payload).json()

    delete_response = client.delete(f"/sensors/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/sensors/{created['id']}")
    assert get_response.status_code == 404


def test_create_sensor_rejects_unknown_sensor_type(client):
    payload = {
        "name": "Bad Type Sensor",
        "model": "unknown",
        "serial_number": "MOCK-BAD-0001",
        "sensor_type": "bluetooth_widget",
    }
    response = client.post("/sensors", json=payload)
    assert response.status_code == 422


def test_create_mock_sensor_rejects_e25877_serial(client):
    payload = {
        "name": "Impersonator",
        "model": "mock",
        "serial_number": "E25877",
        "sensor_type": "mock",
    }
    response = client.post("/sensors", json=payload)
    assert response.status_code == 422


def test_create_mock_sensor_rejects_non_mock_prefixed_serial(client):
    payload = {
        "name": "Ambiguous Mock",
        "model": "mock",
        "serial_number": "AMBIGUOUS-0001",
        "sensor_type": "mock",
    }
    response = client.post("/sensors", json=payload)
    assert response.status_code == 422


def test_create_dracal_sensor_requires_port(client):
    payload = {
        "name": "Portless Dracal",
        "model": "VCP-PTH450-CAL",
        "serial_number": "E99999",
        "sensor_type": "dracal_vcp",
        "port": None,
    }
    response = client.post("/sensors", json=payload)
    assert response.status_code == 422


def test_create_dracal_cli_sensor_does_not_require_port(client):
    payload = {
        "name": "USB Native Dracal",
        "model": "VCP-PTH450-CAL",
        "serial_number": "E27297",
        "sensor_type": "dracal_cli",
        "port": None,
    }
    response = client.post("/sensors", json=payload)
    assert response.status_code == 200
    assert response.json()["port"] is None


def test_create_sensor_rejects_duplicate_serial_with_friendly_400(client):
    payload = {
        "name": "Original",
        "model": "mock",
        "serial_number": "MOCK-DUP-0001",
        "sensor_type": "mock",
    }
    first = client.post("/sensors", json=payload)
    assert first.status_code == 200

    dup_payload = {**payload, "name": "Duplicate"}
    second = client.post("/sensors", json=dup_payload)
    assert second.status_code == 400


def test_patch_sensor_rejects_change_that_produces_invalid_combined_state(client):
    payload = {
        "name": "About To Become Invalid",
        "model": "mock",
        "serial_number": "MOCK-PATCH-0001",
        "sensor_type": "mock",
    }
    created = client.post("/sensors", json=payload).json()

    # Changing type to dracal_vcp without also providing a port must fail,
    # since the sensor's current port is null.
    response = client.patch(f"/sensors/{created['id']}", json={"sensor_type": "dracal_vcp"})
    assert response.status_code == 422


def test_patch_sensor_rejects_duplicate_serial_with_friendly_400(client):
    first = client.post(
        "/sensors",
        json={
            "name": "First",
            "model": "mock",
            "serial_number": "MOCK-PATCHDUP-0001",
            "sensor_type": "mock",
        },
    ).json()
    second = client.post(
        "/sensors",
        json={
            "name": "Second",
            "model": "mock",
            "serial_number": "MOCK-PATCHDUP-0002",
            "sensor_type": "mock",
        },
    ).json()

    response = client.patch(
        f"/sensors/{second['id']}", json={"serial_number": first["serial_number"]}
    )
    assert response.status_code == 400
