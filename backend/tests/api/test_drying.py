"""API-level tests for /drying/recommendations and /drying/sessions."""

from app.db.session import SessionLocal
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.spool_assignment import SpoolAssignment


def _seed_petg_spool(session, *, location_name: str = "API Test Box"):
    profile = session.query(MaterialProfile).filter_by(name="PETG").first()
    assert profile is not None

    location = Location(name=location_name, location_type="storage_box")
    session.add(location)
    session.flush()

    spool = FilamentSpool(material_profile_id=profile.id, brand="TestBrand", color="Black", status="unknown")
    session.add(spool)
    session.flush()

    assignment = SpoolAssignment(spool_id=spool.id, location_id=location.id, is_active=True)
    session.add(assignment)
    session.commit()

    return profile, location, spool


def test_get_recommendations_excludes_a_spool_with_no_sensor_in_its_module(client):
    # get_drying_recommendations reads each active sensor's live current
    # reading (not a persisted Reading row) -- other tests in the suite share
    # this same in-memory DB and may leave their own sensors/spools behind,
    # so this asserts only that OUR spool (which has no sensor anywhere in
    # its location) is correctly excluded, not that the whole list is empty.
    with SessionLocal() as session:
        _profile, _location, spool = _seed_petg_spool(session, location_name="No Sensor API Box")
        spool_id = spool.id

    response = client.get("/drying/recommendations")

    assert response.status_code == 200
    assert all(rec["spool_id"] != spool_id for rec in response.json())


def test_post_session_creates_recommended_session(client):
    with SessionLocal() as session:
        _profile, location, spool = _seed_petg_spool(session)
        location_id = location.id
        spool_id = spool.id

    payload = {
        "spool_id": spool_id,
        "dryer_location_id": location_id,
        "target_temp_c": 60.0,
        "target_duration_hours": 5.0,
    }
    response = client.post("/drying/sessions", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["spool_id"] == spool_id
    assert body["dryer_location_id"] == location_id
    assert body["status"] == "recommended"
    assert body["target_temp_c"] == 60.0
    assert isinstance(body["id"], int)


def test_post_session_with_unknown_spool_returns_404(client):
    with SessionLocal() as session:
        _profile, location, _spool = _seed_petg_spool(session, location_name="404 Test Box")
        location_id = location.id

    payload = {
        "spool_id": 999999,
        "dryer_location_id": location_id,
        "target_temp_c": 60.0,
        "target_duration_hours": 5.0,
    }
    response = client.post("/drying/sessions", json=payload)

    assert response.status_code == 404


def test_post_session_with_unknown_dryer_location_returns_404(client):
    with SessionLocal() as session:
        _profile, _location, spool = _seed_petg_spool(session, location_name="404 Location Box")
        spool_id = spool.id

    payload = {
        "spool_id": spool_id,
        "dryer_location_id": 999999,
        "target_temp_c": 60.0,
        "target_duration_hours": 5.0,
    }
    response = client.post("/drying/sessions", json=payload)

    assert response.status_code == 404


def test_list_sessions_filters_by_spool_id(client):
    with SessionLocal() as session:
        _profile, location, spool = _seed_petg_spool(session, location_name="List Filter Box")
        location_id = location.id
        spool_id = spool.id

    client.post(
        "/drying/sessions",
        json={
            "spool_id": spool_id,
            "dryer_location_id": location_id,
            "target_temp_c": 60.0,
            "target_duration_hours": 5.0,
        },
    )

    response = client.get("/drying/sessions", params={"spool_id": spool_id})

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert all(s["spool_id"] == spool_id for s in body)


def test_patch_session_updates_status_and_notes(client):
    with SessionLocal() as session:
        _profile, location, spool = _seed_petg_spool(session, location_name="Patch Test Box")
        location_id = location.id
        spool_id = spool.id

    created = client.post(
        "/drying/sessions",
        json={
            "spool_id": spool_id,
            "dryer_location_id": location_id,
            "target_temp_c": 60.0,
            "target_duration_hours": 5.0,
        },
    ).json()

    response = client.patch(
        f"/drying/sessions/{created['id']}",
        json={"status": "completed", "validation_notes": "RH dropped to 25% after 5h."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["validation_notes"] == "RH dropped to 25% after 5h."


def test_patch_unknown_session_returns_404(client):
    response = client.patch("/drying/sessions/999999", json={"status": "cancelled"})

    assert response.status_code == 404


def test_post_session_with_archived_spool_returns_404(client):
    with SessionLocal() as session:
        _profile, location, spool = _seed_petg_spool(session, location_name="Archived Spool Box")
        location_id = location.id
        spool_id = spool.id

    client.post(f"/spools/{spool_id}/archive")

    payload = {
        "spool_id": spool_id,
        "dryer_location_id": location_id,
        "target_temp_c": 60.0,
        "target_duration_hours": 5.0,
    }
    response = client.post("/drying/sessions", json=payload)

    assert response.status_code == 404


def test_post_session_with_archived_dryer_location_returns_404(client):
    with SessionLocal() as session:
        _profile, location, spool = _seed_petg_spool(session, location_name="Archived Location Box")
        location_id = location.id
        spool_id = spool.id

    client.post(f"/locations/{location_id}/archive")

    payload = {
        "spool_id": spool_id,
        "dryer_location_id": location_id,
        "target_temp_c": 60.0,
        "target_duration_hours": 5.0,
    }
    response = client.post("/drying/sessions", json=payload)

    assert response.status_code == 404
