"""Tests for app.services.drying_service.get_drying_recommendations.

These reuse the shared `client` fixture (tests/conftest.py) purely to
trigger the app lifespan (create_all + seed), which populates the standard
material profiles (PLA, PETG, ABS, ASA, Nylon, PC, TPU, PVB, PVA, BVOH) from
Requirements.md section 7. Spool/location/sensor fixtures for each test are
inserted directly via SessionLocal(), following the pattern used in
tests/api/test_readings_post.py.

get_drying_recommendations reads each active sensor's LIVE current reading
(not a persisted Reading row) -- so tests monkeypatch
drying_service.get_sensor_reader_for_sensor to return a fixed reading for the
sensor under test, the same monkeypatch pattern already used in
tests/api/test_sensors.py for sensor.test-read.
"""

from types import SimpleNamespace

from app.db.session import SessionLocal
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.printer import Printer
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment
from app.services import drying_service

ADVISORY_TEXT = "the app does not control the dryer directly"


def _patch_sensor_reading(monkeypatch, sensor_id: int, *, temperature_c: float, relative_humidity_percent: float):
    """Makes drying_service.get_sensor_reader_for_sensor return a fixed live
    reading for this one sensor id, delegating to the real reader (and its
    real hardware/mock behavior) for every other sensor -- so seeded sensors
    unrelated to a given test are unaffected.
    """
    from app.services import drying_service as ds

    original_get_reader = ds.get_sensor_reader_for_sensor

    class FakeReader:
        def read_current(self):
            return SimpleNamespace(
                temperature_c=temperature_c, relative_humidity_percent=relative_humidity_percent
            )

    def fake_get_reader(sensor):
        if sensor.id == sensor_id:
            return FakeReader()
        return original_get_reader(sensor)

    monkeypatch.setattr(ds, "get_sensor_reader_for_sensor", fake_get_reader)


def _seed_spool_with_sensor(
    session,
    *,
    material_name: str,
    location_name: str,
    location_type: str = "storage_box",
    max_temp_c: float | None = None,
):
    """Seed a Location (+ optional dryer max_temp_c), a FilamentSpool of the
    given material, an active SpoolAssignment linking them, and an active
    Sensor at that location -- no Reading row, since recommendations are now
    read live from the sensor.
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
    session.commit()

    return profile, location, spool, assignment, sensor


def test_petg_warning_recommendation(client, monkeypatch):
    # PETG seed: ideal RH max 30, warning RH max 40, critical RH max 50,
    # drying_temp_c 60, 4-6h. RH=35 -> warning (ideal < 35 <= warning).
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="PETG", location_name="PETG Test Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=35.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "warning"
    assert rec.drying_temp_c == 60.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 6.0
    assert ADVISORY_TEXT in rec.message


def test_nylon_critical_recommendation(client, monkeypatch):
    # Nylon/PA seed: ideal RH max 15, warning RH max 25, critical RH max 35,
    # drying_temp_c 80, 8-12h. RH=40 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="Nylon", location_name="Nylon Test Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=40.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 80.0
    assert rec.drying_time_hours_min == 8.0
    assert rec.drying_time_hours_max == 12.0
    assert ADVISORY_TEXT in rec.message


def test_pc_warning_recommendation(client, monkeypatch):
    # PC seed: ideal RH max 20, warning RH max 30, critical RH max 40,
    # drying_temp_c 85, 6-8h. RH=25 -> warning.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="PC", location_name="PC Test Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=25.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "warning"
    assert rec.drying_temp_c == 85.0
    assert rec.drying_time_hours_min == 6.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_pva_critical_recommendation(client, monkeypatch):
    # PVA seed: ideal RH max 10, warning RH max 20, critical RH max 30,
    # drying_temp_c 50, 4-8h. RH=32 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="PVA", location_name="PVA Test Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=32.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 50.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_bvoh_critical_recommendation(client, monkeypatch):
    # BVOH seed: ideal RH max 10, warning RH max 20, critical RH max 30,
    # drying_temp_c 50, 4-8h (shares thresholds with PVA). RH=32 -> critical.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="BVOH", location_name="BVOH Test Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=32.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.current_status == "critical"
    assert rec.drying_temp_c == 50.0
    assert rec.drying_time_hours_min == 4.0
    assert rec.drying_time_hours_max == 8.0
    assert ADVISORY_TEXT in rec.message


def test_ok_humidity_spool_is_not_recommended(client, monkeypatch):
    # PETG ideal RH max is 30; RH=20 stays "ok" so no recommendation should
    # be produced for this spool.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session, material_name="PETG", location_name="PETG OK Box"
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=20.0)

        recs = drying_service.get_drying_recommendations(session)

    assert all(r.spool_id != spool.id for r in recs)


def test_spool_with_no_sensor_in_its_module_is_skipped(client):
    with SessionLocal() as session:
        profile = session.query(MaterialProfile).filter_by(name="PETG").first()
        assert profile is not None

        location = Location(name="No Sensor Box", location_type="storage_box")
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


def test_ams_sibling_slot_reading_is_used_for_drying_recommendation(client, monkeypatch):
    # A physical AMS module shares one sensor across all its slots
    # (sensor-per-ams-module task). A spool assigned to a sibling slot that
    # has no sensor of its own must still be recommended for drying, using
    # the live reading from the slot the sensor is actually attached to.
    with SessionLocal() as session:
        profile = session.query(MaterialProfile).filter_by(name="PETG").first()
        assert profile is not None

        printer = Printer(name="Sibling Test Printer", brand="Bambu Lab", model="P1S")
        session.add(printer)
        session.flush()

        sensor_slot = Location(
            name="AMS Slot 1 - Sibling Test Printer",
            location_type="printer_ams",
            printer_id=printer.id,
            slot_index=0,
        )
        spool_slot = Location(
            name="AMS Slot 2 - Sibling Test Printer",
            location_type="printer_ams",
            printer_id=printer.id,
            slot_index=1,
        )
        session.add_all([sensor_slot, spool_slot])
        session.flush()

        spool = FilamentSpool(material_profile_id=profile.id, brand="TestBrand", color="Black", status="unknown")
        session.add(spool)
        session.flush()

        assignment = SpoolAssignment(spool_id=spool.id, location_id=spool_slot.id, is_active=True)
        session.add(assignment)
        session.flush()

        sensor = Sensor(
            name="Sibling AMS Sensor",
            model="mock",
            serial_number="TEST-SIBLING-AMS",
            sensor_type="mock",
            location_id=sensor_slot.id,
        )
        session.add(sensor)
        session.commit()

        # RH=35 -> warning for PETG (ideal max 30, warning max 40), only ever
        # read live at sensor_slot -- never at spool_slot.
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=35.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    assert matching[0].current_status == "warning"


def test_dryer_cannot_reach_recommended_temperature_warns(client, monkeypatch):
    # Nylon requires 80C to dry; assign the spool directly to a "dryer"
    # location whose max_temp_c (70) is below that, and confirm the
    # recommendation flags dryer_capability_ok=False with a warning message.
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session,
            material_name="Nylon",
            location_name="Underpowered Dryer",
            location_type="dryer",
            max_temp_c=70.0,
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=40.0)

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


def test_dryer_capable_of_recommended_temperature(client, monkeypatch):
    with SessionLocal() as session:
        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session,
            material_name="Nylon",
            location_name="Capable Dryer",
            location_type="dryer",
            max_temp_c=90.0,
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=40.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.dryer_capability_ok is True
    assert rec.dryer_location_id == location.id


def test_no_dryer_configured_sets_capability_none(client, monkeypatch):
    # Delete any pre-existing dryer-type Locations (e.g. seeded "Dry Box 1",
    # or ones other tests in this file created) so this test can assert the
    # "no dryer configured" branch in isolation. Must also delete their
    # dependent SpoolAssignment/Sensor rows first -- SQLite reuses a deleted
    # row's integer id for the next insert in this table, so leaving those
    # rows dangling would silently reattach them to whatever new Location a
    # later test creates next, corrupting that test's data.
    with SessionLocal() as session:
        dryer_location_ids = [
            row.id for row in session.query(Location.id).filter(Location.location_type == "dryer")
        ]
        if dryer_location_ids:
            session.query(SpoolAssignment).filter(
                SpoolAssignment.location_id.in_(dryer_location_ids)
            ).delete(synchronize_session=False)
            session.query(Sensor).filter(Sensor.location_id.in_(dryer_location_ids)).delete(
                synchronize_session=False
            )
            session.query(Location).filter(Location.id.in_(dryer_location_ids)).delete(
                synchronize_session=False
            )
        session.commit()

        profile, location, spool, _assignment, sensor = _seed_spool_with_sensor(
            session,
            material_name="PC",
            location_name="Storage With No Dryer",
            location_type="storage_box",
        )
        _patch_sensor_reading(monkeypatch, sensor.id, temperature_c=24.0, relative_humidity_percent=25.0)

        recs = drying_service.get_drying_recommendations(session)

    matching = [r for r in recs if r.spool_id == spool.id]
    assert len(matching) == 1
    rec = matching[0]
    assert rec.dryer_location_id is None
    assert rec.dryer_capability_ok is None
    assert "No dryer location is configured" in rec.message
    assert ADVISORY_TEXT in rec.message
