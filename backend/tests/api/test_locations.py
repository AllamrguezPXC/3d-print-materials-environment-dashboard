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


def test_delete_location_rejected_with_friendly_400_when_referenced_by_assignment(client):
    """Regression test: without SQLite foreign-key enforcement, this delete
    used to silently succeed and leave the SpoolAssignment's location_id
    dangling (no relationship() is declared from Location to
    SpoolAssignment, so the ORM had no way to catch this on its own)."""
    location = client.post(
        "/locations", json={"name": "Referenced Room", "location_type": "room"}
    ).json()
    material_id = client.get("/materials").json()[0]["id"]
    spool = client.post(
        "/spools", json={"material_profile_id": material_id, "brand": "Referenced Brand"}
    ).json()
    client.post(
        "/assignments",
        json={"spool_id": spool["id"], "location_id": location["id"], "is_active": True},
    )

    response = client.delete(f"/locations/{location['id']}")
    assert response.status_code == 400

    get_response = client.get(f"/locations/{location['id']}")
    assert get_response.status_code == 200


def test_create_location_404_for_nonexistent_printer(client):
    response = client.post(
        "/locations",
        json={"name": "Orphan AMS Slot", "location_type": "printer_ams", "printer_id": 999999},
    )
    assert response.status_code == 404


def test_patch_location_404_for_nonexistent_printer(client):
    created = client.post(
        "/locations", json={"name": "Reassignable Location", "location_type": "printer_ams"}
    ).json()

    response = client.patch(f"/locations/{created['id']}", json={"printer_id": 999999})
    assert response.status_code == 404
