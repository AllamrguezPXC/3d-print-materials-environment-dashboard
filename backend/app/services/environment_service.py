import math

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.location import Location
from app.models.sensor import Sensor
from app.schemas.alert import AlertRead
from app.schemas.reading import (
    AffectedSpoolInfo,
    CurrentReadingResponse,
    LocationInfo,
    SensorInfo,
)
from app.sensors.factory import get_sensor_reader
from app.services.alert_service import build_alert_drafts, get_affected_spools


def compute_dew_point_c(temperature_c: float, relative_humidity_percent: float) -> float:
    """Magnus formula approximation of dew point, in degrees Celsius."""
    a, b = 17.62, 243.12
    rh_fraction = max(relative_humidity_percent, 0.1) / 100
    gamma = (a * temperature_c) / (b + temperature_c) + math.log(rh_fraction)
    return round((b * gamma) / (a - gamma), 2)


def build_current_reading(
    settings: Settings, session: Session | None = None, include_alerts: bool = True
) -> CurrentReadingResponse:
    reader = get_sensor_reader(settings)
    reading = reader.read_current()
    dew_point_c = compute_dew_point_c(reading.temperature_c, reading.relative_humidity_percent)

    location_id: int | None = None
    location_info: LocationInfo | None = None
    affected_spools: list[AffectedSpoolInfo] = []
    alerts: list[AlertRead] = []

    if session is not None:
        sensor = session.query(Sensor).filter_by(serial_number=reading.sensor_serial).first()
        location_id = sensor.location_id if sensor else None

        if location_id is not None:
            location = session.get(Location, location_id)
            if location is not None:
                location_info = LocationInfo(
                    id=location.id,
                    name=location.name,
                    location_type=location.location_type,
                    printer_id=location.printer_id,
                )

            affected_spools = [
                AffectedSpoolInfo(
                    spool_id=affected.spool.id,
                    brand=affected.spool.brand,
                    color=affected.spool.color,
                    material_profile_name=affected.material_profile.name,
                    status=affected.spool.status,
                )
                for affected in get_affected_spools(session, location_id)
            ]

        if include_alerts:
            drafts = build_alert_drafts(
                session,
                location_id=location_id,
                temperature_c=reading.temperature_c,
                relative_humidity_percent=reading.relative_humidity_percent,
                pressure_pa=reading.pressure_pa,
                dew_point_c=dew_point_c,
            )
            alerts = [
                AlertRead(
                    severity=d.severity,
                    metric=d.metric,
                    message=d.message,
                    recommended_action=d.recommended_action,
                    spool_id=d.spool_id,
                    material_profile_id=d.material_profile_id,
                    location_id=location_id,
                )
                for d in drafts
            ]

    return CurrentReadingResponse(
        timestamp=reading.timestamp,
        temperature_c=reading.temperature_c,
        relative_humidity_percent=reading.relative_humidity_percent,
        pressure_pa=reading.pressure_pa,
        pressure_kpa=reading.pressure_kpa,
        dew_point_c=dew_point_c,
        source=reading.source,
        sensor=SensorInfo(serial_number=reading.sensor_serial, sensor_type=reading.source),
        location_id=location_id,
        location=location_info,
        affected_spools=affected_spools,
        alerts=alerts,
    )
