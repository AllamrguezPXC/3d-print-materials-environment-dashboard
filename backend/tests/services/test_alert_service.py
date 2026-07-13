from types import SimpleNamespace

from app.db.session import SessionLocal
from app.models.location import Location
from app.services.alert_service import (
    evaluate_dew_point_severity,
    evaluate_humidity_severity,
    evaluate_pressure_sanity,
    evaluate_temperature_severity,
    get_affected_spools,
)

# PLA-like profile: ideal RH<=40, warning<=50, critical>=60; ideal temp 18-30,
# warning 13-35, critical outside that.
PLA_PROFILE = SimpleNamespace(
    ideal_rh_max_percent=40.0,
    warning_rh_max_percent=50.0,
    critical_rh_max_percent=60.0,
    ideal_temp_min_c=18.0,
    ideal_temp_max_c=30.0,
    warning_temp_min_c=13.0,
    warning_temp_max_c=35.0,
)


def test_humidity_ok_at_or_below_ideal():
    assert evaluate_humidity_severity(40.0, PLA_PROFILE) == "ok"
    assert evaluate_humidity_severity(20.0, PLA_PROFILE) == "ok"


def test_humidity_warning_between_ideal_and_warning():
    assert evaluate_humidity_severity(45.0, PLA_PROFILE) == "warning"


def test_humidity_critical_above_warning_or_at_critical():
    assert evaluate_humidity_severity(55.0, PLA_PROFILE) == "critical"
    assert evaluate_humidity_severity(60.0, PLA_PROFILE) == "critical"


def test_temperature_ok_within_ideal_range():
    assert evaluate_temperature_severity(24.0, PLA_PROFILE) == "ok"


def test_temperature_warning_within_warning_range():
    assert evaluate_temperature_severity(32.0, PLA_PROFILE) == "warning"


def test_temperature_critical_outside_warning_range():
    assert evaluate_temperature_severity(40.0, PLA_PROFILE) == "critical"


def test_dew_point_ok_when_gap_is_large():
    assert evaluate_dew_point_severity(temperature_c=25.0, dew_point_c=15.0) == "ok"


def test_dew_point_warning_within_3_degrees():
    assert evaluate_dew_point_severity(temperature_c=25.0, dew_point_c=23.0) == "warning"


def test_dew_point_critical_within_1_degree():
    assert evaluate_dew_point_severity(temperature_c=25.0, dew_point_c=24.5) == "critical"


def test_pressure_ok_within_sane_bounds():
    assert evaluate_pressure_sanity(101000.0) == "ok"


def test_pressure_critical_when_missing():
    assert evaluate_pressure_sanity(None) == "critical"


def test_pressure_critical_when_out_of_range():
    assert evaluate_pressure_sanity(50000.0) == "critical"


def test_get_affected_spools_expands_to_sibling_ams_slots(client):
    """A single sensor covers an entire AMS module's shared microclimate
    (sensor-per-ams-module task): seeded "Mock Sensor 4" sits on P1S #1's
    slot 1, and a demo PLA spool sits on slot 3 of that same AMS -- reading
    off slot 1's location must still surface the spool in slot 3."""
    with SessionLocal() as session:
        slot_1 = session.query(Location).filter_by(name="AMS Slot 1 - P1S #1").first()
        assert slot_1 is not None

        affected = get_affected_spools(session, slot_1.id)

        assert any(a.spool.color == "Silver" for a in affected)


def test_get_affected_spools_does_not_expand_non_printer_locations(client):
    """A standalone location (no printer_id) never expands to unrelated
    locations -- regression guard for the sibling-expansion change."""
    with SessionLocal() as session:
        storage_box_a = session.query(Location).filter_by(name="Storage Box A").first()
        assert storage_box_a is not None

        affected = get_affected_spools(session, storage_box_a.id)

        assert all(a.location_id == storage_box_a.id for a in affected)
        assert any(a.spool.color == "Orange" for a in affected)
