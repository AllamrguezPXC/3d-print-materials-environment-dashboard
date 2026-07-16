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


def _location_id(client, name: str) -> int:
    location = next(loc for loc in client.get("/locations").json() if loc["name"] == name)
    return location["id"]


def test_create_sensor_rejects_second_sensor_on_occupied_ams_module(client):
    """Seeded "Mock Sensor 4" already covers P1S #1's whole AMS module from
    slot 1 -- assigning another sensor to any sibling slot must be rejected,
    since physically only one sensor covers the shared microclimate."""
    slot_2_id = _location_id(client, "AMS Slot 2 - P1S #1")

    response = client.post(
        "/sensors",
        json={
            "name": "Rogue AMS Sensor",
            "model": "mock",
            "serial_number": "MOCK-AMSCONFLICT-0001",
            "sensor_type": "mock",
            "location_id": slot_2_id,
        },
    )
    assert response.status_code == 400


def test_patch_sensor_rejects_moving_into_occupied_ams_module(client):
    slot_3_id = _location_id(client, "AMS Slot 3 - P1S #1")
    created = client.post(
        "/sensors",
        json={
            "name": "Unassigned Sensor",
            "model": "mock",
            "serial_number": "MOCK-AMSCONFLICT-0002",
            "sensor_type": "mock",
        },
    ).json()

    response = client.patch(f"/sensors/{created['id']}", json={"location_id": slot_3_id})
    assert response.status_code == 400


def test_update_sensor_can_reassign_within_its_own_ams_module(client):
    """A sensor moving to a different slot of the SAME AMS it already
    covers must not self-conflict (exclude_id)."""
    mock_sensor_4 = next(s for s in client.get("/sensors").json() if s["serial_number"] == "MOCK-0004")
    slot_2_id = _location_id(client, "AMS Slot 2 - P1S #1")

    response = client.patch(f"/sensors/{mock_sensor_4['id']}", json={"location_id": slot_2_id})
    assert response.status_code == 200
    assert response.json()["location_id"] == slot_2_id


def test_create_sensor_on_non_printer_location_is_unrestricted(client):
    """Locations without a printer_id (room/storage_box/dry_box) are
    unaffected by the AMS-sensor-conflict rule -- confirms the fix is
    scoped to printer modules only, per the user's stated hardware
    constraint (one sensor per printer/AMS module or dryer)."""
    storage_box_a_id = _location_id(client, "Storage Box A")

    response = client.post(
        "/sensors",
        json={
            "name": "Second Storage Sensor",
            "model": "mock",
            "serial_number": "MOCK-NONAMS-0001",
            "sensor_type": "mock",
            "location_id": storage_box_a_id,
        },
    )
    assert response.status_code == 200


def test_create_sensor_404_for_nonexistent_location(client):
    response = client.post(
        "/sensors",
        json={
            "name": "Ghost Location Sensor",
            "model": "mock",
            "serial_number": "MOCK-GHOST-0001",
            "sensor_type": "mock",
            "location_id": 999999,
        },
    )
    assert response.status_code == 404


def test_patch_sensor_404_for_nonexistent_location(client):
    created = client.post(
        "/sensors",
        json={
            "name": "Reassignable Sensor",
            "model": "mock",
            "serial_number": "MOCK-GHOST-0002",
            "sensor_type": "mock",
        },
    ).json()

    response = client.patch(f"/sensors/{created['id']}", json={"location_id": 999999})
    assert response.status_code == 404


def test_archive_sensor_hides_from_list_and_get(client):
    created = client.post(
        "/sensors",
        json={
            "name": "Archivable Sensor",
            "model": "mock",
            "serial_number": "MOCK-ARCHIVE-0001",
            "sensor_type": "mock",
        },
    ).json()

    response = client.post(f"/sensors/{created['id']}/archive")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is not None

    assert client.get(f"/sensors/{created['id']}").status_code == 404
    assert not any(s["id"] == created["id"] for s in client.get("/sensors").json())


def test_restore_sensor_brings_it_back(client):
    created = client.post(
        "/sensors",
        json={
            "name": "Restorable Sensor",
            "model": "mock",
            "serial_number": "MOCK-RESTORE-0001",
            "sensor_type": "mock",
        },
    ).json()
    client.post(f"/sensors/{created['id']}/archive")

    response = client.post(f"/sensors/{created['id']}/restore")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is None
    assert client.get(f"/sensors/{created['id']}").status_code == 200


def test_list_sensors_deleted_only_returns_only_archived(client):
    created = client.post(
        "/sensors",
        json={
            "name": "Deleted Only Sensor",
            "model": "mock",
            "serial_number": "MOCK-DELONLY-0001",
            "sensor_type": "mock",
        },
    ).json()
    client.post(f"/sensors/{created['id']}/archive")

    body = client.get("/sensors", params={"deleted_only": True}).json()
    assert any(s["id"] == created["id"] for s in body)
    assert all(s["deleted_at"] is not None for s in body)


def test_archived_sensor_serial_number_is_reusable(client):
    payload = {
        "name": "Serial Reuse Original",
        "model": "mock",
        "serial_number": "MOCK-REUSE-0001",
        "sensor_type": "mock",
    }
    created = client.post("/sensors", json=payload).json()
    client.post(f"/sensors/{created['id']}/archive")

    response = client.post(
        "/sensors",
        json={**payload, "name": "Serial Reuse New"},
    )
    assert response.status_code == 200


def test_duplicate_sensor_creates_independent_copy_with_adjusted_serial(client):
    # A standalone (non-printer) location avoids the AMS-sibling-conflict
    # check entirely, so this test isn't coupled to other tests' mutations
    # of the shared seeded AMS module state.
    own_location = client.post(
        "/locations", json={"name": "Duplicate Sensor Test Room", "location_type": "room"}
    ).json()
    created = client.post(
        "/sensors",
        json={
            "name": "Original Sensor",
            "model": "mock",
            "serial_number": "MOCK-DUPLICATE-0001",
            "sensor_type": "mock",
            "location_id": own_location["id"],
        },
    ).json()

    response = client.post(f"/sensors/{created['id']}/duplicate")
    assert response.status_code == 200
    copy = response.json()
    assert copy["id"] != created["id"]
    assert copy["name"] == "Original Sensor (Copy)"
    assert copy["serial_number"] == "MOCK-DUPLICATE-0001-COPY"
    assert copy["location_id"] is None


def test_archived_sensor_excluded_from_current_readings(client):
    mock_sensor = next(s for s in client.get("/sensors").json() if s["serial_number"] == "MOCK-0001")

    before = client.get("/readings/current").json()
    assert any(e["sensor"]["id"] == mock_sensor["id"] for e in before["sensors"])

    client.post(f"/sensors/{mock_sensor['id']}/archive")

    after = client.get("/readings/current").json()
    assert not any(e["sensor"]["id"] == mock_sensor["id"] for e in after["sensors"])

    client.post(f"/sensors/{mock_sensor['id']}/restore")


def test_create_sensor_404_for_archived_location(client):
    location = client.post(
        "/locations", json={"name": "Archived Room For Sensor", "location_type": "room"}
    ).json()
    client.post(f"/locations/{location['id']}/archive")

    response = client.post(
        "/sensors",
        json={
            "name": "Sensor On Archived Location",
            "model": "mock",
            "serial_number": "MOCK-ARCHIVEDLOCATION-0001",
            "sensor_type": "mock",
            "location_id": location["id"],
        },
    )
    assert response.status_code == 404
