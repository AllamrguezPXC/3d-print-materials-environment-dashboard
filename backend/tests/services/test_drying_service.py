"""Tests for app.services.drying_service.get_drying_recommendations.

These reuse the shared `client` fixture (tests/conftest.py) purely to
trigger the app lifespan (create_all + seed), which populates the standard
material profiles (PLA, PETG, ABS, ASA, Nylon, PC, TPU, PVB, PVA, BVOH) from
Requirements.md section 7. Spool/location/reading fixtures for each test are
inserted directly via SessionLocal(), following the pattern used in
tests/api/test_readings_post.py.
"""

from datetime import datetime, timezone

from app.db.session import SessionLocal
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.reading import Reading
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment
from app.services import drying_service

ADVISORY_TEXT = "the app does not control the dryer directly"


def _seed_spool_with_reading(
    session,
    *,
    material_name: str,
    location_name: str,
    location_type: str = "storage_box",
    max_temp_c: float | None = None,
    rh_percent: float,
    temperature_c: float = 24.0,
):
    """Seed a Location (+ optional dryer max_temp_c), a FilamentSpool of the
    given material, an active SpoolAssignment linking them, and a Reading at
    that location with the given humidity so the spool shows up with a
    known humidity status.
    """
    profile = session.query(MaterialProfile).filter_by(name=material_name).first()
    assert profile is not None, f"expected seeded material profile '{material_name}'"

    location = Location(name=location_name, location_type=location_type, max_temp_c=max_temp_c)
    session.add(location)
    session.flush()

    spool = FilamentSpool(
        material_profile_id=profile.id, brand="TestBrand", color="Black", status="unknown"
    )
    session.add(spool)
    session.flush()

    assignment = SpoolAssignment(spool_id=spool.id, location_id=location.id, is_active=True)
    session.add(assignment)
    session.flush()

    sensor = Sensor(
        name=f"Test Sensor for {location_name}",
        model="mock",
        serial_number=f"TEST-{location_name}",
        sensor_type="mock",
        location_id=location.id,
    )
    session.add(sensor)
    session.flush()

    reading = Reading(
        sensor_id=sensor.id,
        location_id=location.id,
        timestamp=datetime.now(timezone.utc),
        temperature_c=temperature_c,
        relative_humidity_percent=rh_percent,
        pressure_pa=101000.0,
        pressure_kpa=101.0,
        source="mock",
    )
    session.add(reading)
    session.commit()

    return profile, location, spool, assignment


def test_petg_warning_recommendation(client):
    # PETG seed: ideal RH max 30, warning RH max 40, critical RH max 50,
    # drying_temp_c 60, 4-6h. RH=35 -> warning (ideal < 35 <= warning).
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="PETG", location_name="PETG Test Box", rh_percent=35.0
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "warning"
    assert rec.drying_temp_c == 60.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 6.0
    assert ADVISORY_TEXT in rec.message


def test_nylon_critical_recommendation(client):
    # Nylon/PA seed: ideal RH max 15, warning RH max 25, critical RH max 35,
    # drying_temp_c 80, 8-12h. RH=40 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="Nylon", location_name="Nylon Test Box", rh_percent=40.0
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 80.0
    assert rec.drying_time_hours_min == 8.0
    assert rec.drying_time_hours_max == 12.0
    assert ADVISORY_TEXT in rec.message


def test_pc_warning_recommendation(client):
    # PC seed: ideal RH max 20, warning RH max 30, critical RH max 40,
    # drying_temp_c 85, 6-8h. RH=25 -> warning.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="PC", location_name="PC Test Box", rh_percent=25.0
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "warning"
    assert rec.drying_temp_c == 85.0
    assert rec.drying_time_hours_min == 6.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_pva_critical_recommendation(client):
    # PVA seed: ideal RH max 10, warning RH max 20, critical RH max 30,
    # drying_temp_c 50, 4-8h. RH=32 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="PVA", location_name="PVA Test Box", rh_percent=32.0
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 50.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_bvoh_critical_recommendation(client):
    # BVOH seed: ideal RH max 10, warning RH max 20, critical RH max 30,
    # drying_temp_c 50, 4-8h (shares thresholds with PVA). RH=32 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="BVOH", location_name="BVOH Test Box", rh_percent=32.0
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 50.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_ok_humidity_spool_is_not_recommended(client):
    # PETG ideal RH max is 30; RH=20 stays "ok" so no recommendation should
    # be produced for this spool.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session, material_name="PETG", location_name="PETG OK Box", rh_percent=20.0
        )

        recs = drying_service.get_drying_recommendations(session)

    assert all(r.spool_id != spool.id for r in recs)


def test_spool_with_no_reading_history_is_skipped(client):
    with SessionLocal() as session:
        profile = session.query(MaterialProfile).filter_by(name="PETG").first()
        assert profile is not None

        location = Location(name="No Reading Box", location_type="storage_box")
        session.add(location)
        session.flush()

        spool = FilamentSpool(
            material_profile_id=profile.id, brand="TestBrand", color="Black", status="unknown"
        )
        session.add(spool)
        session.flush()

        assignment = SpoolAssignment(spool_id=spool.id, location_id=location.id, is_active=True)
        session.add(assignment)
        session.commit()

        recs = drying_service.get_drying_recommendations(session)

    assert all(r.spool_id != spool.id for r in recs)


def test_dryer_cannot_reach_recommended_temperature_warns(client):
    # Nylon requires 80C to dry; assign the spool directly to a "dryer"
    # location whose max_temp_c (70) is below that, and confirm the
    # recommendation flags dryer_capability_ok=False with a warning message.
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session,
            material_name="Nylon",
            location_name="Underpowered Dryer",
            location_type="dryer",
            max_temp_c=70.0,
            rh_percent=40.0,
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.dryer_location_id == location.id
    assert rec.dryer_max_temp_c == 70.0
    assert rec.dryer_capability_ok is False
    assert "Warning" in rec.message
    assert "70.0" in rec.message and "80.0" in rec.message
    assert ADVISORY_TEXT in rec.message


def test_dryer_capable_of_recommended_temperature(client):
    with SessionLocal() as session:
        profile, location, spool, _assignment = _seed_spool_with_reading(
            session,
            material_name="Nylon",
            location_name="Capable Dryer",
            location_type="dryer",
            max_temp_c=90.0,
            rh_percent=40.0,
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.dryer_capability_ok is True
    assert rec.dryer_location_id == location.id


def test_no_dryer_configured_sets_capability_none(client):
    # Delete any pre-existing dryer-type Locations (e.g. seeded "Dry Box 1")
    # so this test can assert the "no dryer configured" branch in isolation.
    with SessionLocal() as session:
        session.query(Location).filter(Location.location_type == "dryer").delete()
        session.commit()

        profile, location, spool, _assignment = _seed_spool_with_reading(
            session,
            material_name="PC",
            location_name="Storage With No Dryer",
            location_type="storage_box",
            rh_percent=25.0,
        )

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.dryer_location_id is None
    assert rec.dryer_capability_ok is None
    assert "No dryer location is configured" in rec.message
    assert ADVISORY_TEXT in rec.message
