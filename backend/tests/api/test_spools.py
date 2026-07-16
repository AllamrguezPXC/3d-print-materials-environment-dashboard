def _first_material_profile_id(client) -> int:
    materials = client.get("/materials").json()
    assert materials, "expected seeded material profiles to exist"
    return materials[0]["id"]


def test_list_spools_includes_seeded_spools(client):
    response = client.get("/spools")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 2


def test_create_and_fetch_spool(client):
    material_id = _first_material_profile_id(client)
    payload = {
        "material_profile_id": material_id,
        "brand": "Test Brand",
        "color": "Blue",
        "status": "ready",
    }
    create_response = client.post("/spools", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)
    assert created["color"] == "Blue"

    get_response = client.get(f"/spools/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["brand"] == "Test Brand"


def test_create_spool_without_color_succeeds(client):
    # color is optional -- the frontend (Add Filament, Read from AMS) always
    # allows an empty color, so the backend must accept a missing/null one.
    material_id = _first_material_profile_id(client)
    payload = {"material_profile_id": material_id, "brand": "No Color Brand"}
    response = client.post("/spools", json=payload)
    assert response.status_code == 200
    assert response.json()["color"] is None


def test_delete_spool_rejected_with_friendly_400_when_referenced_by_assignment(client):
    material_id = _first_material_profile_id(client)
    spool = client.post(
        "/spools",
        json={"material_profile_id": material_id, "brand": "Assigned Brand", "color": "Yellow"},
    ).json()
    location = client.get("/locations").json()[0]
    client.post(
        "/assignments",
        json={"spool_id": spool["id"], "location_id": location["id"], "is_active": True},
    )

    response = client.delete(f"/spools/{spool['id']}")
    assert response.status_code == 400


def test_get_spool_404_for_missing_id(client):
    response = client.get("/spools/999999")
    assert response.status_code == 404


def test_create_spool_404_for_nonexistent_material_profile(client):
    response = client.post("/spools", json={"material_profile_id": 999999, "brand": "Ghost Brand"})
    assert response.status_code == 404


def test_patch_spool_404_for_nonexistent_material_profile(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools", json={"material_profile_id": material_id, "brand": "Reassignable Brand"}
    ).json()

    response = client.patch(f"/spools/{created['id']}", json={"material_profile_id": 999999})
    assert response.status_code == 404


def test_patch_spool_updates_fields(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools",
        json={
            "material_profile_id": material_id,
            "brand": "Patchable Brand",
            "color": "Green",
        },
    ).json()

    response = client.patch(f"/spools/{created['id']}", json={"status": "needs_drying"})
    assert response.status_code == 200
    assert response.json()["status"] == "needs_drying"


def test_delete_spool_happy_path(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools",
        json={
            "material_profile_id": material_id,
            "brand": "Deletable Brand",
            "color": "Red",
        },
    ).json()

    delete_response = client.delete(f"/spools/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/spools/{created['id']}")
    assert get_response.status_code == 404


def test_archive_spool_hides_from_list_and_get(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools", json={"material_profile_id": material_id, "brand": "Archivable Brand"}
    ).json()

    response = client.post(f"/spools/{created['id']}/archive")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is not None

    assert client.get(f"/spools/{created['id']}").status_code == 404
    assert not any(s["id"] == created["id"] for s in client.get("/spools").json())


def test_restore_spool_brings_it_back(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools", json={"material_profile_id": material_id, "brand": "Restorable Brand"}
    ).json()
    client.post(f"/spools/{created['id']}/archive")

    response = client.post(f"/spools/{created['id']}/restore")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is None
    assert client.get(f"/spools/{created['id']}").status_code == 200


def test_list_spools_deleted_only_returns_only_archived(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools", json={"material_profile_id": material_id, "brand": "Deleted Only Brand"}
    ).json()
    client.post(f"/spools/{created['id']}/archive")

    body = client.get("/spools", params={"deleted_only": True}).json()
    assert any(s["id"] == created["id"] for s in body)
    assert all(s["deleted_at"] is not None for s in body)


def test_duplicate_spool_creates_independent_copy(client):
    material_id = _first_material_profile_id(client)
    created = client.post(
        "/spools",
        json={
            "material_profile_id": material_id,
            "brand": "Original Brand",
            "color": "Orange",
            "remaining_weight_g": 500.0,
        },
    ).json()

    response = client.post(f"/spools/{created['id']}/duplicate")
    assert response.status_code == 200
    copy = response.json()
    assert copy["id"] != created["id"]
    assert copy["brand"] == "Original Brand"
    assert copy["color"] == "Orange"
    assert copy["remaining_weight_g"] == 500.0
