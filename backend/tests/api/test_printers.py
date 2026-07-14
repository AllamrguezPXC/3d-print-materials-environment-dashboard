def test_list_printers_includes_seeded_printers(client):
    response = client.get("/printers")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) >= 7
    assert any(p["name"] == "A1 mini #1" for p in body)


def test_create_and_fetch_printer(client):
    payload = {"name": "Test Printer", "brand": "Bambu Lab", "model": "A1 mini"}
    create_response = client.post("/printers", json=payload)
    assert create_response.status_code == 200
    created = create_response.json()
    assert isinstance(created["id"], int)

    get_response = client.get(f"/printers/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Test Printer"


def test_create_printer_defaults_filament_system_type_to_manual(client):
    payload = {"name": "Default Type Printer", "brand": "Bambu Lab", "model": "A1 mini"}
    response = client.post("/printers", json=payload)
    assert response.status_code == 200
    assert response.json()["filament_system_type"] == "manual"


def test_create_printer_accepts_valid_filament_system_type(client):
    payload = {
        "name": "AMS Printer",
        "brand": "Bambu Lab",
        "model": "P1S",
        "filament_system_type": "ams",
    }
    response = client.post("/printers", json=payload)
    assert response.status_code == 200
    assert response.json()["filament_system_type"] == "ams"


def test_create_printer_rejects_invalid_filament_system_type(client):
    payload = {
        "name": "Bad Type Printer",
        "brand": "Bambu Lab",
        "model": "A1 mini",
        "filament_system_type": "carrier_pigeon",
    }
    response = client.post("/printers", json=payload)
    assert response.status_code == 422


def test_patch_printer_rejects_invalid_filament_system_type(client):
    created = client.post(
        "/printers", json={"name": "Patchable Type Printer", "brand": "Bambu Lab", "model": "P1P"}
    ).json()

    response = client.patch(
        f"/printers/{created['id']}", json={"filament_system_type": "carrier_pigeon"}
    )
    assert response.status_code == 422


def test_seeded_printers_have_consistent_filament_system_type(client):
    printers = client.get("/printers").json()
    a1_mini_1 = next(p for p in printers if p["name"] == "A1 mini #1")
    p1s_1 = next(p for p in printers if p["name"] == "P1S #1")
    p1s_2 = next(p for p in printers if p["name"] == "P1S #2")

    assert a1_mini_1["filament_system_type"] == "ams"
    assert p1s_1["filament_system_type"] == "ams"
    assert p1s_2["filament_system_type"] == "external_spool"


def test_create_printer_defaults_operational_status_to_activo(client):
    payload = {"name": "Default Status Printer", "brand": "Bambu Lab", "model": "A1 mini"}
    response = client.post("/printers", json=payload)
    assert response.status_code == 200
    assert response.json()["operational_status"] == "activo"


def test_create_printer_accepts_valid_operational_status(client):
    payload = {
        "name": "Maintenance Printer",
        "brand": "Bambu Lab",
        "model": "P1S",
        "operational_status": "mantenimiento",
    }
    response = client.post("/printers", json=payload)
    assert response.status_code == 200
    assert response.json()["operational_status"] == "mantenimiento"


def test_create_printer_rejects_invalid_operational_status(client):
    payload = {
        "name": "Bad Status Printer",
        "brand": "Bambu Lab",
        "model": "A1 mini",
        "operational_status": "on_fire",
    }
    response = client.post("/printers", json=payload)
    assert response.status_code == 422


def test_patch_printer_rejects_invalid_operational_status(client):
    created = client.post(
        "/printers", json={"name": "Patchable Status Printer", "brand": "Bambu Lab", "model": "P1P"}
    ).json()

    response = client.patch(f"/printers/{created['id']}", json={"operational_status": "on_fire"})
    assert response.status_code == 422


def test_patch_printer_updates_operational_status(client):
    created = client.post(
        "/printers", json={"name": "Status Update Printer", "brand": "Bambu Lab", "model": "P1P"}
    ).json()

    response = client.patch(f"/printers/{created['id']}", json={"operational_status": "inactivo"})
    assert response.status_code == 200
    assert response.json()["operational_status"] == "inactivo"


def test_patch_printer_to_ams_creates_four_slot_locations(client):
    created = client.post(
        "/printers", json={"name": "AMS Sync Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    response = client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams"})
    assert response.status_code == 200

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    assert len(ams_locations) == 4
    assert sorted(loc["slot_index"] for loc in ams_locations) == [0, 1, 2, 3]


def test_patch_printer_to_ams_twice_does_not_duplicate_slots(client):
    created = client.post(
        "/printers", json={"name": "AMS Idempotent Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams"})
    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "external_spool"})
    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams"})

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    assert len(ams_locations) == 4


def test_patch_printer_to_external_spool_creates_one_location(client):
    created = client.post(
        "/printers", json={"name": "External Spool Sync Printer", "brand": "Bambu Lab", "model": "A1 mini"}
    ).json()

    response = client.patch(f"/printers/{created['id']}", json={"filament_system_type": "external_spool"})
    assert response.status_code == 200

    locations = client.get("/locations").json()
    ext_locations = [
        loc
        for loc in locations
        if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_external_spool"
    ]
    assert len(ext_locations) == 1


def test_patch_printer_switching_types_never_deletes_existing_locations(client):
    # Switching AMS -> external_spool must not remove the AMS slots already
    # created -- the sync is additive-only, never destructive.
    created = client.post(
        "/printers", json={"name": "Never Delete Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams"})
    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "external_spool"})

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    ext_locations = [
        loc
        for loc in locations
        if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_external_spool"
    ]
    assert len(ams_locations) == 4
    assert len(ext_locations) == 1


def test_patch_printer_to_storage_only_does_not_change_locations(client):
    created = client.post(
        "/printers", json={"name": "Storage Only Printer", "brand": "Bambu Lab", "model": "P1P"}
    ).json()

    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams"})
    response = client.patch(f"/printers/{created['id']}", json={"filament_system_type": "storage_only"})
    assert response.status_code == 200

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    assert len(ams_locations) == 4


def test_patch_printer_to_ams_external_spool_creates_both_location_kinds(client):
    created = client.post(
        "/printers", json={"name": "Hybrid Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    response = client.patch(
        f"/printers/{created['id']}", json={"filament_system_type": "ams_external_spool"}
    )
    assert response.status_code == 200

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    ext_locations = [
        loc
        for loc in locations
        if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_external_spool"
    ]
    assert len(ams_locations) == 4
    assert len(ext_locations) == 1


def test_patch_printer_ams_external_spool_is_idempotent(client):
    created = client.post(
        "/printers", json={"name": "Hybrid Idempotent Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams_external_spool"})
    client.patch(f"/printers/{created['id']}", json={"filament_system_type": "ams_external_spool"})

    locations = client.get("/locations").json()
    ams_locations = [
        loc for loc in locations if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_ams"
    ]
    ext_locations = [
        loc
        for loc in locations
        if loc["printer_id"] == created["id"] and loc["location_type"] == "printer_external_spool"
    ]
    assert len(ams_locations) == 4
    assert len(ext_locations) == 1


def test_get_printer_404_for_missing_id(client):
    response = client.get("/printers/999999")
    assert response.status_code == 404


def test_patch_printer_updates_fields(client):
    created = client.post(
        "/printers", json={"name": "Patchable Printer", "brand": "Bambu Lab", "model": "P1S"}
    ).json()

    response = client.patch(f"/printers/{created['id']}", json={"notes": "needs calibration"})
    assert response.status_code == 200
    assert response.json()["notes"] == "needs calibration"


def test_delete_printer_happy_path(client):
    created = client.post(
        "/printers", json={"name": "Deletable Printer", "brand": "Bambu Lab", "model": "P1P"}
    ).json()

    delete_response = client.delete(f"/printers/{created['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/printers/{created['id']}")
    assert get_response.status_code == 404
