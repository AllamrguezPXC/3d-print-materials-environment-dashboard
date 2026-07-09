from datetime import datetime

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.reading import Reading
from app.models.sensor import Sensor


def get_or_create_sensor(
    session: Session,
    serial_number: str,
    sensor_type: str,
    model: str = "unknown",
) -> Sensor:
    sensor = session.query(Sensor).filter_by(serial_number=serial_number).first()
    if sensor:
        return sensor

    sensor = Sensor(
        name=f"{sensor_type} {serial_number}",
        model=model,
        serial_number=serial_number,
        sensor_type=sensor_type,
        is_active=True,
    )
    session.add(sensor)
    session.flush()
    return sensor


def save_reading(
    session: Session,
    sensor_id: int,
    location_id: int | None,
    timestamp: datetime,
    temperature_c: float,
    relative_humidity_percent: float,
    pressure_pa: float,
    pressure_kpa: float,
    dew_point_c: float | None,
    source: str,
    raw_payload: str | None,
) -> Reading:
    reading = Reading(
        sensor_id=sensor_id,
        location_id=location_id,
        timestamp=timestamp,
        temperature_c=temperature_c,
        relative_humidity_percent=relative_humidity_percent,
        pressure_pa=pressure_pa,
        pressure_kpa=pressure_kpa,
        dew_point_c=dew_point_c,
        source=source,
        raw_payload=raw_payload,
    )
    session.add(reading)
    session.flush()
    return reading


def query_readings(
    session: Session,
    from_dt: datetime,
    to_dt: datetime,
    sensor_id: int | None = None,
    location_id: int | None = None,
) -> list[Reading]:
    filters = [Reading.timestamp >= from_dt, Reading.timestamp <= to_dt]
    if sensor_id is not None:
        filters.append(Reading.sensor_id == sensor_id)
    if location_id is not None:
        filters.append(Reading.location_id == location_id)

    return (
        session.query(Reading)
        .filter(and_(*filters))
        .order_by(Reading.timestamp.asc())
        .all()
    )
