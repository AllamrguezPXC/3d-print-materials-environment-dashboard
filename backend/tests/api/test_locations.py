def test_list_locations_includes_seeded_location(client):
    response = client.get("/locations")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert any(loc["name"] == "Primary Filament Storage Room" for loc in body)


def test_create_and_fetch_location(client):
    payload = {"name": "Test Storage Box", "location_type": "storage_box"}
    create_response = client.post("/locations", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)

    get_response = client.get(f"/locations/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Test Storage Box"


def test_get_location_404_for_missing_id(client):
    response = client.get("/locations/999999")
    assert response.status_code == 404


def test_patch_location_updates_fields(client):
    created = client.post(
        "/locations", json={"name": "Patchable Dry Box", "location_type": "dry_box"}
    ).json()

    response = client.patch(f"/locations/{created['id']}", json={"max_temp_c": 55.0})
    assert response.status_code == 200
    assert response.json()["max_temp_c"] == 55.0


def test_create_location_with_slot_index(client):
    payload = {"name": "AMS Slot 5 - Test Printer", "location_type": "printer_ams", "slot_index": 4}
    response = client.post("/locations", json=payload)

    assert response.status_code == 200
    assert response.json()["slot_index"] == 4


def test_seeded_ams_slots_have_ordered_slot_index(client):
    response = client.get("/locations")
    assert response.status_code == 200
    body = response.json()

    p1s_slots = sorted(
        (loc for loc in body if loc["name"].endswith("- P1S #1")),
        key=lambda loc: loc["slot_index"],
    )
    assert len(p1s_slots) == 4
    assert [loc["slot_index"] for loc in p1s_slots] == [0, 1, 2, 3]

    a1_mini_slot = next(loc for loc in body if loc["name"] == "AMS Slot 1 - A1 mini #1")
    assert a1_mini_slot["slot_index"] == 0


def test_delete_location_happy_path(client):
    created = client.post(
        "/locations", json={"name": "Deletable Room", "location_type": "room"}
    ).json()

    delete_response = client.delete(f"/locations/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/locations/{created['id']}")
    assert get_response.status_code == 404
