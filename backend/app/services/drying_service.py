"""Drying recommendation + drying session business logic (Requirements.md
section 9 and section 12.2).

Drying recommendations are advisory only: this module never implies that the
application controls a physical dryer. Every recommendation message
explicitly states that a human must verify dryer capability and monitor RH
with a sensor before marking a spool ready.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment
from app.models.drying_session import DryingSession
from app.schemas.drying import DryingRecommendation, DryingSessionCreate, DryingSessionUpdate
from app.sensors.base import SensorParseError
from app.sensors.factory import get_sensor_reader_for_sensor
from app.services.alert_service import _resolve_covered_location_ids, evaluate_humidity_severity

ADVISORY_DISCLAIMER = (
    "This recommendation is advisory only — the app does not control the dryer directly. "
    "Place a Dracal sensor near the dryer exhaust or inside a safe monitored area and confirm "
    "relative humidity decreases toward the target range before marking the spool ready."
)


def _describe_location(location: Location, assignment: SpoolAssignment) -> str:
    """Human-readable location descriptor, e.g. "P1S #1 / AMS Slot 2"."""
    parts: list[str] = []
    if location.printer is not None:
        parts.append(location.printer.name)
    else:
        parts.append(location.name)
    if assignment.slot_name:
        parts.append(assignment.slot_name)
    return " / ".join(parts)


def _find_nearest_dryer_location(session: Session) -> Location | None:
    """Find a candidate dryer Location to suggest for drying.

    There is no geographic/distance data in the schema, so "nearest" is
    interpreted as "the first dryer-type Location on record" (ordered by id),
    i.e. the first one an operator configured. If multiple dryers exist,
    this picks the first as a suggested candidate rather than ranking them.
    """
    return (
        session.query(Location)
        .filter(Location.location_type == "dryer")
        .order_by(Location.id.asc())
        .first()
    )


def _assignments_covering(session: Session, location_id: int):
    """(assignment, spool, profile, location) rows for every active
    assignment in the sibling-expanded module a sensor at `location_id`
    covers -- same expansion `alert_service.get_affected_spools` uses, so a
    spool assigned to any slot of an AMS module a sensor is attached to is
    covered here too.
    """
    covered_ids = _resolve_covered_location_ids(session, location_id)
    return (
        session.query(SpoolAssignment, FilamentSpool, MaterialProfile, Location)
        .join(FilamentSpool, SpoolAssignment.spool_id == FilamentSpool.id)
        .join(MaterialProfile, FilamentSpool.material_profile_id == MaterialProfile.id)
        .join(Location, SpoolAssignment.location_id == Location.id)
        .filter(SpoolAssignment.location_id.in_(covered_ids), SpoolAssignment.is_active.is_(True))
        .all()
    )


def get_drying_recommendations(session: Session) -> list[DryingRecommendation]:
    """Build drying recommendations from every active sensor's LIVE current
    reading -- the same live computation GET /readings/current uses for the
    Dashboard's alert panels (Sensor -> live read -> evaluate_humidity_severity),
    not a persisted Reading row. This is deliberate: a persisted Reading is
    only ever written when someone uses "Capture reading now" on /history, so
    it can be stale by minutes relative to what the Dashboard shows live right
    now -- the exact inconsistency this replaced (a spool flagged critical on
    the Dashboard but silently absent here, or vice versa).

    A sensor with no location, or whose read fails (offline/misconfigured),
    contributes nothing (mirrors GET /readings/current's per-sensor error
    isolation). Spools currently reading "ok" humidity are skipped -- no
    drying recommendation is needed while readiness is fine.
    """
    recommendations: list[DryingRecommendation] = []
    seen_spool_ids: set[int] = set()

    active_sensors = session.query(Sensor).filter_by(is_active=True).order_by(Sensor.id.asc()).all()

    for sensor in active_sensors:
        if sensor.location_id is None:
            continue

        try:
            raw = get_sensor_reader_for_sensor(sensor).read_current()
        except (SensorParseError, OSError, ValueError):
            continue

        for assignment, spool, profile, location in _assignments_covering(session, sensor.location_id):
            if spool.id in seen_spool_ids:
                continue

            status = evaluate_humidity_severity(raw.relative_humidity_percent, profile)
            if status == "ok":
                continue
            seen_spool_ids.add(spool.id)

            if location.location_type == "dryer":
                dryer_location = location
            else:
                dryer_location = _find_nearest_dryer_location(session)

            dryer_location_id: int | None = None
            dryer_max_temp_c: float | None = None
            dryer_capability_ok: bool | None = None

            location_desc = _describe_location(location, assignment)
            spool_desc = f"{spool.brand} {profile.name} {spool.color} spool #{spool.id}"

            message = (
                f"{location_desc} / {spool_desc} is above its humidity limit ({status}, "
                f"{round(raw.relative_humidity_percent, 2)}% RH). "
                f"Dry at {profile.drying_temp_c}°C for {profile.drying_time_hours_min}-"
                f"{profile.drying_time_hours_max} hours."
            )

            if dryer_location is None:
                message += " No dryer location is configured in the system yet; add one to verify drying capability."
            else:
                dryer_location_id = dryer_location.id
                dryer_max_temp_c = dryer_location.max_temp_c
                if dryer_location.max_temp_c is None:
                    dryer_capability_ok = None
                    message += (
                        f" Dryer location '{dryer_location.name}' has no recorded max temperature; "
                        f"verify it can sustain {profile.drying_temp_c}°C before use."
                    )
                else:
                    dryer_capability_ok = dryer_location.max_temp_c >= profile.drying_temp_c
                    if not dryer_capability_ok:
                        message += (
                            f" Warning: dryer location '{dryer_location.name}' max temperature "
                            f"({dryer_location.max_temp_c}°C) is below the recommended "
                            f"{profile.drying_temp_c}°C — verify the dryer can sustain the requested "
                            "temperature before drying."
                        )
                    else:
                        message += (
                            f" Dryer location '{dryer_location.name}' can sustain the recommended temperature."
                        )

            message += " " + ADVISORY_DISCLAIMER

            recommendations.append(
                DryingRecommendation(
                    spool_id=spool.id,
                    material_profile_name=profile.name,
                    current_status=status,
                    drying_temp_c=profile.drying_temp_c,
                    drying_time_hours_min=profile.drying_time_hours_min,
                    drying_time_hours_max=profile.drying_time_hours_max,
                    dryer_location_id=dryer_location_id,
                    dryer_capability_ok=dryer_capability_ok,
                    dryer_max_temp_c=dryer_max_temp_c,
                    message=message,
                )
            )

    return recommendations


def create_drying_session(session: Session, payload: DryingSessionCreate) -> DryingSession:
    """Record a drying session (recommendation or in-progress validation).

    This only persists a record for tracking/validation purposes — it does
    not start or control any physical dryer.
    """
    spool = session.get(FilamentSpool, payload.spool_id)
    if spool is None:
        raise HTTPException(status_code=404, detail=f"Spool {payload.spool_id} not found.")

    dryer_location = session.get(Location, payload.dryer_location_id)
    if dryer_location is None:
        raise HTTPException(status_code=404, detail=f"Location {payload.dryer_location_id} not found.")

    if payload.sensor_id is not None:
        sensor = session.get(Sensor, payload.sensor_id)
        if sensor is None:
            raise HTTPException(status_code=404, detail=f"Sensor {payload.sensor_id} not found.")

    drying_session = DryingSession(
        spool_id=payload.spool_id,
        dryer_location_id=payload.dryer_location_id,
        sensor_id=payload.sensor_id,
        target_temp_c=payload.target_temp_c,
        target_duration_hours=payload.target_duration_hours,
        status="recommended",
    )
    session.add(drying_session)
    session.commit()
    session.refresh(drying_session)
    return drying_session


def list_drying_sessions(
    session: Session,
    spool_id: int | None = None,
    status: str | None = None,
) -> list[DryingSession]:
    query = session.query(DryingSession)
    if spool_id is not None:
        query = query.filter(DryingSession.spool_id == spool_id)
    if status is not None:
        query = query.filter(DryingSession.status == status)
    return query.order_by(DryingSession.started_at.desc()).all()


def update_drying_session(
    session: Session, session_id: int, payload: DryingSessionUpdate
) -> DryingSession | None:
    drying_session = session.get(DryingSession, session_id)
    if drying_session is None:
        return None

    if payload.status is not None:
        drying_session.status = payload.status
    if payload.ended_at is not None:
        drying_session.ended_at = payload.ended_at
    if payload.validation_notes is not None:
        drying_session.validation_notes = payload.validation_notes

    session.commit()
    session.refresh(drying_session)
    return drying_session
