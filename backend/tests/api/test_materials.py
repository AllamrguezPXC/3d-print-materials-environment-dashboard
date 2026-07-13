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


def test_delete_material_happy_path(client):
    created = client.post("/materials", json=MATERIAL_PAYLOAD).json()

    delete_response = client.delete(f"/materials/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/materials/{created['id']}")
    assert get_response.status_code == 404
