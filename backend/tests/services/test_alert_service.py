from types import SimpleNamespace

from app.services.alert_service import (
    evaluate_dew_point_severity,
    evaluate_humidity_severity,
    evaluate_pressure_sanity,
    evaluate_temperature_severity,
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
