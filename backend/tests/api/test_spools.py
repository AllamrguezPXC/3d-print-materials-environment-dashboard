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


def test_get_spool_404_for_missing_id(client):
    response = client.get("/spools/999999")
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
