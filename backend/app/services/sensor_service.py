"""Thin CRUD service for Sensor (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.sensor import Sensor
from app.schemas.sensor import SensorCreate, SensorUpdate


def list_sensors(session: Session) -> list[Sensor]:
    return session.query(Sensor).order_by(Sensor.id.asc()).all()


def get_sensor_or_404(session: Session, sensor_id: int) -> Sensor:
    sensor = session.get(Sensor, sensor_id)
    if sensor is None:
        raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found.")
    return sensor


def create_sensor(session: Session, payload: SensorCreate) -> Sensor:
    sensor = Sensor(**payload.model_dump())
    session.add(sensor)
    session.commit()
    session.refresh(sensor)
    return sensor


def update_sensor(session: Session, sensor_id: int, payload: SensorUpdate) -> Sensor:
    sensor = get_sensor_or_404(session, sensor_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sensor, field, value)
    session.commit()
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
