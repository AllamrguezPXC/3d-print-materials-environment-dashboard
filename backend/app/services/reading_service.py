from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sensor import Sensor
from app.repositories.reading_repository import get_or_create_sensor, query_readings, save_reading
from app.schemas.alert import AlertRead
from app.schemas.reading import (
    HourlyAggregate,
    ReadingCreate,
    ReadingCreateResponse,
    ReadingCreateResult,
    ReadingRead,
    ReadingsCaptureResponse,
)
from app.sensors.base import SensorParseError
from app.sensors.factory import get_sensor_reader_for_sensor
from app.services.alert_service import build_alert_drafts, persist_alerts
from app.services.environment_service import compute_dew_point_c


def capture_and_persist_all_active_sensors(session: Session) -> ReadingsCaptureResponse:
    """POST /readings with an empty body: capture and persist a reading from
    every active sensor row. Never invents a reading for a sensor that isn't
    configured -- returns an empty list with `message` if none are active.
    A single sensor's read error is recorded on its own result entry rather
    than aborting the whole request, so one failing physical sensor doesn't
    prevent the others from being captured.
    """
    active_sensors = (
        session.query(Sensor)
        .filter_by(is_active=True)
        .filter(Sensor.deleted_at.is_(None))
        .order_by(Sensor.id.asc())
        .all()
    )
    if not active_sensors:
        return ReadingsCaptureResponse(readings=[], message="No active sensors configured.")

    results: list[ReadingCreateResult] = []
    for sensor in active_sensors:
        try:
            raw = get_sensor_reader_for_sensor(sensor).read_current()
        except (SensorParseError, OSError, ValueError) as exc:
            results.append(ReadingCreateResult(sensor_id=sensor.id, error=str(exc)))
            continue

        dew_point_c = compute_dew_point_c(raw.temperature_c, raw.relative_humidity_percent)
        reading = save_reading(
            session,
            sensor_id=sensor.id,
            location_id=sensor.location_id,
            timestamp=raw.timestamp,
            temperature_c=raw.temperature_c,
            relative_humidity_percent=raw.relative_humidity_percent,
            pressure_pa=raw.pressure_pa,
            pressure_kpa=raw.pressure_kpa,
            dew_point_c=dew_point_c,
            source=raw.source,
            raw_payload=raw.raw_payload,
        )
        alerts = _evaluate_and_persist_alerts(session, reading, dew_point_c)
        results.append(
            ReadingCreateResult(
                sensor_id=sensor.id,
                reading=ReadingRead.model_validate(reading),
                alerts=[AlertRead.model_validate(a) for a in alerts],
            )
        )

    session.commit()
    return ReadingsCaptureResponse(readings=results)


def persist_manual_reading(session: Session, payload: ReadingCreate) -> ReadingCreateResponse:
    """POST /readings with a manual/mock payload in the body."""
    if payload.sensor_id is not None:
        sensor = session.get(Sensor, payload.sensor_id)
        if sensor is None:
            raise HTTPException(status_code=404, detail=f"Sensor {payload.sensor_id} not found.")
    else:
        sensor = get_or_create_sensor(
            session,
            serial_number=f"MANUAL-{payload.source}",
            sensor_type=payload.source,
            model="manual",
        )

    location_id = payload.location_id if payload.location_id is not None else sensor.location_id
    timestamp = payload.timestamp or datetime.now(timezone.utc)
    dew_point_c = compute_dew_point_c(payload.temperature_c, payload.relative_humidity_percent)

    reading = save_reading(
        session,
        sensor_id=sensor.id,
        location_id=location_id,
        timestamp=timestamp,
        temperature_c=payload.temperature_c,
        relative_humidity_percent=payload.relative_humidity_percent,
        pressure_pa=payload.pressure_pa,
        pressure_kpa=payload.pressure_kpa,
        dew_point_c=dew_point_c,
        source=payload.source,
        raw_payload=None,
    )

    alerts = _evaluate_and_persist_alerts(session, reading, dew_point_c)
    session.commit()

    return ReadingCreateResponse(
        reading=ReadingRead.model_validate(reading),
        alerts=[AlertRead.model_validate(a) for a in alerts],
    )


def _evaluate_and_persist_alerts(session: Session, reading, dew_point_c: float | None):
    if reading.location_id is None or dew_point_c is None:
        return []

    drafts = build_alert_drafts(
        session,
        location_id=reading.location_id,
        temperature_c=reading.temperature_c,
        relative_humidity_percent=reading.relative_humidity_percent,
        pressure_pa=reading.pressure_pa,
        dew_point_c=dew_point_c,
    )
    if not drafts:
        return []
    return persist_alerts(
        session,
        reading_id=reading.id,
        sensor_id=reading.sensor_id,
        location_id=reading.location_id,
        drafts=drafts,
    )


def get_readings_history(
    session: Session,
    from_dt: datetime,
    to_dt: datetime,
    sensor_id: int | None,
    location_id: int | None,
    aggregate: str,
) -> tuple[list[ReadingRead], list[HourlyAggregate]]:
    if to_dt < from_dt:
        raise HTTPException(status_code=400, detail="`to` must not be earlier than `from`.")

    rows = query_readings(session, from_dt, to_dt, sensor_id=sensor_id, location_id=location_id)

    if aggregate != "hour":
        return [ReadingRead.model_validate(r) for r in rows], []

    buckets: dict[datetime, list] = defaultdict(list)
    for row in rows:
        hour_key = row.timestamp.replace(minute=0, second=0, microsecond=0)
        buckets[hour_key].append(row)

    def _dew_point_average(bucket: list) -> float | None:
        values = [r.dew_point_c for r in bucket if r.dew_point_c is not None]
        if not values:
            return None
        return round(sum(values) / len(values), 2)

    hourly = [
        HourlyAggregate(
            hour=hour,
            temperature_c=round(sum(r.temperature_c for r in bucket) / len(bucket), 2),
            relative_humidity_percent=round(
                sum(r.relative_humidity_percent for r in bucket) / len(bucket), 2
            ),
            pressure_pa=round(sum(r.pressure_pa for r in bucket) / len(bucket), 2),
            dew_point_c=_dew_point_average(bucket),
            sample_count=len(bucket),
        )
        for hour, bucket in sorted(buckets.items())
    ]
    return [], hourly
