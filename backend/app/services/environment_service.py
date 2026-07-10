import math

from sqlalchemy.orm import Session

from app.models.location import Location
from app.models.sensor import Sensor
from app.schemas.alert import AlertRead
from app.schemas.reading import (
    AffectedSpoolInfo,
    CurrentReadingsResponse,
    LocationInfo,
    SensorInfo,
    SensorReadingEntry,
)
from app.sensors.base import SensorParseError
from app.sensors.factory import get_sensor_reader_for_sensor
from app.services.alert_service import build_alert_drafts, get_affected_spools

# Maps a Sensor row's stored sensor_type to the reading-facing "source"
# vocabulary (Literal["real", "mock", "manual"]) used by SensorInfo/DTOs.
_SOURCE_BY_SENSOR_TYPE = {
    "dracal_vcp": "real",
    "dracal_cli": "real",
    "mock": "mock",
}


def compute_dew_point_c(temperature_c: float, relative_humidity_percent: float) -> float:
    """Magnus formula approximation of dew point, in degrees Celsius."""
    a, b = 17.62, 243.12
    rh_fraction = max(relative_humidity_percent, 0.1) / 100
    gamma = (a * temperature_c) / (b + temperature_c) + math.log(rh_fraction)
    return round((b * gamma) / (a - gamma), 2)


def _map_source(sensor_type: str) -> str:
    return _SOURCE_BY_SENSOR_TYPE.get(sensor_type, "manual")


def _resolve_location(session: Session, location_id: int | None) -> LocationInfo | None:
    if location_id is None:
        return None
    location = session.get(Location, location_id)
    if location is None:
        return None
    return LocationInfo(
        id=location.id,
        name=location.name,
        location_type=location.location_type,
        printer_id=location.printer_id,
    )


def _build_entry(session: Session, sensor: Sensor, include_alerts: bool) -> SensorReadingEntry:
    sensor_info = SensorInfo(
        id=sensor.id,
        serial_number=sensor.serial_number,
        model=sensor.model,
        sensor_type=_map_source(sensor.sensor_type),
    )
    location_info = _resolve_location(session, sensor.location_id)

    try:
        raw = get_sensor_reader_for_sensor(sensor).read_current()
    except (SensorParseError, OSError, ValueError) as exc:
        # A single sensor's hardware/config error must never abort the whole
        # request or hide the other sensors' readings.
        return SensorReadingEntry(
            sensor=sensor_info,
            location_id=sensor.location_id,
            location=location_info,
            source=_map_source(sensor.sensor_type),
            error=str(exc),
        )

    dew_point_c = compute_dew_point_c(raw.temperature_c, raw.relative_humidity_percent)

    affected_spools: list[AffectedSpoolInfo] = []
    alerts: list[AlertRead] = []
    if sensor.location_id is not None:
        affected_spools = [
            AffectedSpoolInfo(
                spool_id=affected.spool.id,
                brand=affected.spool.brand,
                color=affected.spool.color,
                material_profile_name=affected.material_profile.name,
                status=affected.spool.status,
            )
            for affected in get_affected_spools(session, sensor.location_id)
        ]

        if include_alerts:
            drafts = build_alert_drafts(
                session,
                location_id=sensor.location_id,
                temperature_c=raw.temperature_c,
                relative_humidity_percent=raw.relative_humidity_percent,
                pressure_pa=raw.pressure_pa,
                dew_point_c=dew_point_c,
            )
            alerts = [
                AlertRead(
                    sensor_id=sensor.id,
                    severity=d.severity,
                    metric=d.metric,
                    message=d.message,
                    recommended_action=d.recommended_action,
                    spool_id=d.spool_id,
                    material_profile_id=d.material_profile_id,
                    location_id=sensor.location_id,
                )
                for d in drafts
            ]

    return SensorReadingEntry(
        sensor=sensor_info,
        location_id=sensor.location_id,
        location=location_info,
        timestamp=raw.timestamp,
        temperature_c=raw.temperature_c,
        relative_humidity_percent=raw.relative_humidity_percent,
        pressure_pa=raw.pressure_pa,
        pressure_kpa=raw.pressure_kpa,
        dew_point_c=dew_point_c,
        source=raw.source,
        affected_spools=affected_spools,
        alerts=alerts,
    )


def build_current_readings(session: Session, include_alerts: bool = True) -> CurrentReadingsResponse:
    active_sensors = (
        session.query(Sensor).filter_by(is_active=True).order_by(Sensor.id.asc()).all()
    )
    if not active_sensors:
        return CurrentReadingsResponse(sensors=[], message="No active sensors configured.")

    entries = [_build_entry(session, sensor, include_alerts) for sensor in active_sensors]
    return CurrentReadingsResponse(sensors=entries)
