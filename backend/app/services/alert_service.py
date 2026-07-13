from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.spool_assignment import SpoolAssignment

Severity = Literal["ok", "warning", "critical"]

# Pressure sanity bounds: readings outside this range indicate a sensor
# parsing/hardware issue, not an actual atmospheric condition. Pressure
# never gates filament readiness by itself (Requirements.md §8.3).
PRESSURE_SANE_MIN_PA = 80_000.0
PRESSURE_SANE_MAX_PA = 110_000.0

DEW_POINT_WARNING_GAP_C = 3.0
DEW_POINT_CRITICAL_GAP_C = 1.0


@dataclass
class AffectedSpool:
    spool: FilamentSpool
    material_profile: MaterialProfile
    location_id: int


@dataclass
class AlertDraft:
    severity: Literal["warning", "critical"]
    metric: Literal["temperature", "humidity", "pressure", "dew_point"]
    message: str
    recommended_action: str | None
    spool_id: int | None = None
    material_profile_id: int | None = None


def evaluate_humidity_severity(rh_percent: float, profile: MaterialProfile) -> Severity:
    """Requirements.md §8.1."""
    if rh_percent > profile.warning_rh_max_percent or rh_percent >= profile.critical_rh_max_percent:
        return "critical"
    if rh_percent > profile.ideal_rh_max_percent:
        return "warning"
    return "ok"


def evaluate_temperature_severity(temp_c: float, profile: MaterialProfile) -> Severity:
    """Requirements.md §8.2."""
    if profile.ideal_temp_min_c <= temp_c <= profile.ideal_temp_max_c:
        return "ok"
    if profile.warning_temp_min_c <= temp_c <= profile.warning_temp_max_c:
        return "warning"
    return "critical"


def evaluate_dew_point_severity(temperature_c: float, dew_point_c: float) -> Severity:
    """Requirements.md §8.4."""
    gap = temperature_c - dew_point_c
    if gap <= DEW_POINT_CRITICAL_GAP_C:
        return "critical"
    if gap <= DEW_POINT_WARNING_GAP_C:
        return "warning"
    return "ok"


def evaluate_pressure_sanity(pressure_pa: float | None) -> Severity:
    """Requirements.md §8.3 — traceability only, never gates readiness alone."""
    if pressure_pa is None:
        return "critical"
    if not (PRESSURE_SANE_MIN_PA <= pressure_pa <= PRESSURE_SANE_MAX_PA):
        return "critical"
    return "ok"


def _resolve_covered_location_ids(session: Session, location_id: int) -> list[int]:
    """A sensor covers exactly one Location -- except a printer module (e.g. an
    AMS) that's split across several sibling Location rows sharing the same
    printer_id, which physically share one sensor's microclimate. Expand to
    every sibling sharing (printer_id, location_type) in that case; a bare
    room/storage_box/dry_box location (printer_id is None) is never expanded.
    """
    location = session.get(Location, location_id)
    if location is None or location.printer_id is None:
        return [location_id]
    siblings = (
        session.query(Location.id)
        .filter(
            Location.printer_id == location.printer_id,
            Location.location_type == location.location_type,
        )
        .all()
    )
    return [row.id for row in siblings]


def get_affected_spools(session: Session, location_id: int) -> list[AffectedSpool]:
    covered_ids = _resolve_covered_location_ids(session, location_id)
    rows = (
        session.query(SpoolAssignment, FilamentSpool, MaterialProfile)
        .join(FilamentSpool, SpoolAssignment.spool_id == FilamentSpool.id)
        .join(MaterialProfile, FilamentSpool.material_profile_id == MaterialProfile.id)
        .filter(SpoolAssignment.location_id.in_(covered_ids), SpoolAssignment.is_active.is_(True))
        .all()
    )
    return [
        AffectedSpool(spool=spool, material_profile=profile, location_id=assignment.location_id)
        for assignment, spool, profile in rows
    ]


def build_alert_drafts(
    session: Session,
    location_id: int | None,
    temperature_c: float,
    relative_humidity_percent: float,
    pressure_pa: float,
    dew_point_c: float,
) -> list[AlertDraft]:
    """Evaluate a reading against every spool/material assigned to its
    location. Returns transient drafts — callers decide whether to persist
    them as Alert rows (POST /readings) or return them as-is (GET /current).
    """
    drafts: list[AlertDraft] = []

    pressure_severity = evaluate_pressure_sanity(pressure_pa)
    if pressure_severity != "ok":
        drafts.append(
            AlertDraft(
                severity=pressure_severity,
                metric="pressure",
                message=f"Pressure reading {pressure_pa} Pa is outside the sensor's realistic operating range.",
                recommended_action="Check sensor wiring/placement; pressure does not affect filament readiness by itself.",
            )
        )

    if location_id is None:
        return drafts

    for affected in get_affected_spools(session, location_id):
        profile = affected.material_profile

        humidity_severity = evaluate_humidity_severity(relative_humidity_percent, profile)
        if humidity_severity != "ok":
            drafts.append(
                AlertDraft(
                    severity=humidity_severity,
                    metric="humidity",
                    message=(
                        f"{profile.name} spool #{affected.spool.id} humidity {relative_humidity_percent}% "
                        f"exceeds its {humidity_severity} threshold."
                    ),
                    recommended_action=(
                        f"Dry at {profile.drying_temp_c}C for {profile.drying_time_hours_min}-"
                        f"{profile.drying_time_hours_max}h before use."
                    ),
                    spool_id=affected.spool.id,
                    material_profile_id=profile.id,
                )
            )

        temperature_severity = evaluate_temperature_severity(temperature_c, profile)
        if temperature_severity != "ok":
            drafts.append(
                AlertDraft(
                    severity=temperature_severity,
                    metric="temperature",
                    message=(
                        f"{profile.name} spool #{affected.spool.id} temperature {temperature_c}C "
                        f"is outside its {temperature_severity} range."
                    ),
                    recommended_action="Move spool/printer to a location within the material's ideal temperature range.",
                    spool_id=affected.spool.id,
                    material_profile_id=profile.id,
                )
            )

    dew_point_severity = evaluate_dew_point_severity(temperature_c, dew_point_c)
    if dew_point_severity != "ok":
        drafts.append(
            AlertDraft(
                severity=dew_point_severity,
                metric="dew_point",
                message=(
                    f"Temperature ({temperature_c}C) is within {round(temperature_c - dew_point_c, 2)}C "
                    f"of the dew point ({dew_point_c}C) — condensation risk."
                ),
                recommended_action="Seal or move affected spools away from the condensation-risk area.",
            )
        )

    return drafts


def persist_alerts(
    session: Session,
    reading_id: int,
    sensor_id: int,
    location_id: int,
    drafts: list[AlertDraft],
) -> list[Alert]:
    alerts: list[Alert] = []
    for draft in drafts:
        alert = Alert(
            reading_id=reading_id,
            sensor_id=sensor_id,
            location_id=location_id,
            spool_id=draft.spool_id,
            material_profile_id=draft.material_profile_id,
            severity=draft.severity,
            metric=draft.metric,
            message=draft.message,
            recommended_action=draft.recommended_action,
            is_active=True,
        )
        session.add(alert)
        alerts.append(alert)
    session.flush()
    return alerts
