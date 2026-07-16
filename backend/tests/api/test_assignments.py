def _first_spool_id(client) -> int:
    spools = client.get("/spools").json()
    assert spools, "expected seeded filament spools to exist"
    return spools[0]["id"]


def _first_location_id(client) -> int:
    locations = client.get("/locations").json()
    assert locations, "expected seeded locations to exist"
    return locations[0]["id"]


def test_list_assignments_includes_seeded_assignments(client):
    response = client.get("/assignments")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 2


def test_create_assignment(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)

    payload = {
        "spool_id": spool_id,
        "location_id": location_id,
        "slot_name": "Test Slot",
    }
    create_response = client.post("/assignments", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)
    assert created["slot_name"] == "Test Slot"
    assert created["is_active"] is True
    assert created["assigned_at"] is not None


def test_patch_assignment_updates_fields(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    created = client.post(
        "/assignments", json={"spool_id": spool_id, "location_id": location_id}
    ).json()

    response = client.patch(f"/assignments/{created['id']}", json={"is_active": False})
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_delete_assignment_happy_path(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    created = client.post(
        "/assignments", json={"spool_id": spool_id, "location_id": location_id}
    ).json()

    delete_response = client.delete(f"/assignments/{created['id']}")
    assert delete_response.status_code == 204

    list_response = client.get("/assignments")
    assert all(a["id"] != created["id"] for a in list_response.json())


def test_patch_assignment_404_for_missing_id(client):
    response = client.patch("/assignments/999999", json={"is_active": False})
    assert response.status_code == 404


def test_create_assignment_404_for_nonexistent_spool(client):
    location_id = _first_location_id(client)

    response = client.post("/assignments", json={"spool_id": 999999, "location_id": location_id})
    assert response.status_code == 404


def test_create_assignment_404_for_nonexistent_location(client):
    spool_id = _first_spool_id(client)

    response = client.post("/assignments", json={"spool_id": spool_id, "location_id": 999999})
    assert response.status_code == 404


def test_patch_assignment_404_when_reassigning_to_nonexistent_spool(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    created = client.post(
        "/assignments", json={"spool_id": spool_id, "location_id": location_id}
    ).json()

    response = client.patch(f"/assignments/{created['id']}", json={"spool_id": 999999})
    assert response.status_code == 404


def test_patch_assignment_404_when_reassigning_to_nonexistent_location(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    created = client.post(
        "/assignments", json={"spool_id": spool_id, "location_id": location_id}
    ).json()

    response = client.patch(f"/assignments/{created['id']}", json={"location_id": 999999})
    assert response.status_code == 404


def test_create_assignment_404_for_archived_spool(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    client.post(f"/spools/{spool_id}/archive")

    response = client.post("/assignments", json={"spool_id": spool_id, "location_id": location_id})
    assert response.status_code == 404

    client.post(f"/spools/{spool_id}/restore")


def test_create_assignment_404_for_archived_location(client):
    spool_id = _first_spool_id(client)
    location_id = _first_location_id(client)
    client.post(f"/locations/{location_id}/archive")

    response = client.post("/assignments", json={"spool_id": spool_id, "location_id": location_id})
    assert response.status_code == 404

    client.post(f"/locations/{location_id}/restore")
