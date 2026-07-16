MATERIAL_PAYLOAD = {
    "name": "Test PLA",
    "family": "PLA-derived",
    "ideal_temp_min_c": 18.0,
    "ideal_temp_max_c": 30.0,
    "warning_temp_min_c": 13.0,
    "warning_temp_max_c": 35.0,
    "critical_temp_min_c": 8.0,
    "critical_temp_max_c": 40.0,
    "ideal_rh_max_percent": 40.0,
    "warning_rh_max_percent": 50.0,
    "critical_rh_max_percent": 60.0,
    "drying_temp_c": 45.0,
    "drying_time_hours_min": 4.0,
    "drying_time_hours_max": 6.0,
}


def test_list_materials_includes_seeded_profiles(client):
    response = client.get("/materials")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 10
    assert any(m["name"] == "PLA" for m in body)


def test_seeded_manufacturer_profile_overrides_family_default(client):
    """Requirements.md section 7 rule 1 / CLAUDE.md Domain Rules: a
    manufacturer-specific profile shares its family with the generic default
    but carries distinct (tighter) thresholds a spool can opt into."""
    body = client.get("/materials").json()
    generic = next(m for m in body if m["name"] == "PLA")
    manufacturer_specific = next(m for m in body if m["name"] == "Prusament PLA")

    assert manufacturer_specific["manufacturer"] == "Prusament"
    assert manufacturer_specific["family"] == generic["family"]
    assert manufacturer_specific["ideal_rh_max_percent"] < generic["ideal_rh_max_percent"]


def test_create_and_fetch_material(client):
    create_response = client.post("/materials", json=MATERIAL_PAYLOAD)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)
    assert created["name"] == "Test PLA"

    get_response = client.get(f"/materials/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["family"] == "PLA-derived"


def test_get_material_404_for_missing_id(client):
    response = client.get("/materials/999999")
    assert response.status_code == 404


def test_patch_material_updates_fields(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    response = client.patch(f"/materials/{created['id']}", json={"warning_rh_max_percent": 55.0})
    assert response.status_code == 200
    assert response.json()["warning_rh_max_percent"] == 55.0


def test_create_material_rejects_inverted_rh_thresholds(client):
    payload = {
        **MATERIAL_PAYLOAD,
        "ideal_rh_max_percent": 80.0,
        "warning_rh_max_percent": 20.0,
        "critical_rh_max_percent": 10.0,
    }
    response = client.post("/materials", json=payload)
    assert response.status_code == 422


def test_create_material_rejects_inverted_temp_range(client):
    payload = {**MATERIAL_PAYLOAD, "ideal_temp_min_c": 30.0, "ideal_temp_max_c": 10.0}
    response = client.post("/materials", json=payload)
    assert response.status_code == 422


def test_create_material_rejects_inverted_drying_time_range(client):
    payload = {**MATERIAL_PAYLOAD, "drying_time_hours_min": 10.0, "drying_time_hours_max": 2.0}
    response = client.post("/materials", json=payload)
    assert response.status_code == 422


def test_create_material_accepts_valid_thresholds(client):
    response = client.post("/materials", json=MATERIAL_PAYLOAD)
    assert response.status_code == 200


def test_patch_material_rejects_update_that_inverts_thresholds(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    # ideal_rh_max_percent (40) alone, unchanged, is still <= the current
    # warning (50) -- but raising it above critical_rh_max_percent (60)
    # must be rejected even though only one field is being patched.
    response = client.patch(f"/materials/{created['id']}", json={"ideal_rh_max_percent": 70.0})
    assert response.status_code == 422


def test_delete_material_happy_path(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    delete_response = client.delete(f"/materials/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/materials/{created['id']}")
    assert get_response.status_code == 404


def test_archive_material_hides_from_list_and_get(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    response = client.post(f"/materials/{created['id']}/archive")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is not None

    assert client.get(f"/materials/{created['id']}").status_code == 404
    assert not any(m["id"] == created["id"] for m in client.get("/materials").json())


def test_restore_material_brings_it_back(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()
    client.post(f"/materials/{created['id']}/archive")

    response = client.post(f"/materials/{created['id']}/restore")
    assert response.status_code == 200
    assert response.json()["deleted_at"] is None
    assert client.get(f"/materials/{created['id']}").status_code == 200


def test_list_materials_deleted_only_returns_only_archived(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()
    client.post(f"/materials/{created['id']}/archive")

    body = client.get("/materials", params={"deleted_only": True}).json()
    assert any(m["id"] == created["id"] for m in body)
    assert all(m["deleted_at"] is not None for m in body)


def test_duplicate_material_creates_independent_copy(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    response = client.post(f"/materials/{created['id']}/duplicate")
    assert response.status_code == 200
    copy = response.json()
    assert copy["id"] != created["id"]
    assert copy["name"] == "Test PLA (Copy)"
    assert copy["ideal_rh_max_percent"] == MATERIAL_PAYLOAD["ideal_rh_max_percent"]


def test_create_spool_404_for_archived_material_profile(client):
    material = client.post("/materials", json=MATERIAL_PAYLOAD).json()
    client.post(f"/materials/{material['id']}/archive")

    response = client.post(
        "/spools", json={"material_profile_id": material["id"], "brand": "Archived Material Brand"}
    )
    assert response.status_code == 404
