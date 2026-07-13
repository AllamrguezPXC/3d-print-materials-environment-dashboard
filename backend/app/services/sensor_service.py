"""Thin CRUD service for Sensor (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.location import Location
from app.models.sensor import Sensor
from app.schemas.sensor import SensorCreate, SensorUpdate
from app.services.sensor_validation import validate_sensor_fields


def list_sensors(session: Session) -> list[Sensor]:
    return session.query(Sensor).order_by(Sensor.id.asc()).all()


def get_sensor_or_404(session: Session, sensor_id: int) -> Sensor:
    sensor = session.get(Sensor, sensor_id)
    if sensor is None:
        raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found.")
    return sensor


def _check_duplicate_serial(session: Session, serial_number: str, *, exclude_id: int | None = None) -> None:
    query = session.query(Sensor).filter_by(serial_number=serial_number)
    if exclude_id is not None:
        query = query.filter(Sensor.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=400,
            detail=f"A sensor with serial_number {serial_number!r} already exists.",
        )


def _check_ams_sensor_conflict(session: Session, location_id: int | None, *, exclude_id: int | None = None) -> None:
    """Physically, one sensor covers an entire printer module's (e.g. an AMS)
    shared microclimate -- reject assigning a second sensor to any sibling
    Location of a printer module that already has one assigned."""
    if location_id is None:
        return
    location = session.get(Location, location_id)
    if location is None or location.printer_id is None:
        return
    sibling_ids = [
        row.id
        for row in session.query(Location.id).filter(
            Location.printer_id == location.printer_id,
            Location.location_type == location.location_type,
        )
    ]
    query = session.query(Sensor).filter(Sensor.location_id.in_(sibling_ids))
    if exclude_id is not None:
        query = query.filter(Sensor.id != exclude_id)
    existing = query.first()
    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This printer module already has a sensor assigned ({existing.name!r}) -- only "
                "one sensor covers an entire module's shared microclimate."
            ),
        )


def create_sensor(session: Session, payload: SensorCreate) -> Sensor:
    fields = payload.model_dump()
    try:
        validate_sensor_fields(
            sensor_type=fields["sensor_type"],
            serial_number=fields["serial_number"],
            port=fields["port"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    _check_duplicate_serial(session, fields["serial_number"])
    _check_ams_sensor_conflict(session, fields["location_id"])

    sensor = Sensor(**fields)
    session.add(sensor)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"A sensor with serial_number {fields['serial_number']!r} already exists.",
        ) from exc
    session.refresh(sensor)
    return sensor


def update_sensor(session: Session, sensor_id: int, payload: SensorUpdate) -> Sensor:
    sensor = get_sensor_or_404(session, sensor_id)
    updates = payload.model_dump(exclude_unset=True)

    merged_sensor_type = updates.get("sensor_type", sensor.sensor_type)
    merged_serial_number = updates.get("serial_number", sensor.serial_number)
    merged_port = updates.get("port", sensor.port)

    try:
        validate_sensor_fields(
            sensor_type=merged_sensor_type,
            serial_number=merged_serial_number,
            port=merged_port,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if "serial_number" in updates:
        _check_duplicate_serial(session, merged_serial_number, exclude_id=sensor_id)

    if "location_id" in updates:
        _check_ams_sensor_conflict(session, updates["location_id"], exclude_id=sensor_id)

    for field, value in updates.items():
        setattr(sensor, field, value)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"A sensor with serial_number {merged_serial_number!r} already exists.",
        ) from exc
    session.refresh(sensor)
    return sensor


def delete_sensor(session: Session, sensor_id: int) -> None:
    sensor = get_sensor_or_404(session, sensor_id)
    session.delete(sensor)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Sensor {sensor_id} cannot be deleted because it is referenced by other records.",
        ) from exc
