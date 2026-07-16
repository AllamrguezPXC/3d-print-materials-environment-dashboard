from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sensor import (
    SensorCreate,
    SensorPortInfo,
    SensorRead,
    SensorTestReadResult,
    SensorUpdate,
)
from app.services.sensor_ports import list_available_ports, test_read_sensor
from app.services.sensor_service import (
    archive_sensor,
    create_sensor,
    delete_sensor,
    duplicate_sensor,
    get_sensor_or_404,
    list_sensors,
    restore_sensor,
    update_sensor,
)

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.get("", response_model=list[SensorRead])
@router.get("/", response_model=list[SensorRead], include_in_schema=False)
def list_all_sensors(deleted_only: bool = False, db: Session = Depends(get_db)) -> list[SensorRead]:
    return list_sensors(db, deleted_only=deleted_only)


@router.post("", response_model=SensorRead)
@router.post("/", response_model=SensorRead, include_in_schema=False)
def create_new_sensor(payload: SensorCreate, db: Session = Depends(get_db)) -> SensorRead:
    return create_sensor(db, payload)


# Registered before /{sensor_id} so "ports" isn't shadowed as a sensor_id path param.
@router.get("/ports", response_model=list[SensorPortInfo])
def list_sensor_ports() -> list[SensorPortInfo]:
    return list_available_ports()


@router.get("/{sensor_id}", response_model=SensorRead)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)) -> SensorRead:
    return get_sensor_or_404(db, sensor_id)


@router.patch("/{sensor_id}", response_model=SensorRead)
def patch_sensor(sensor_id: int, payload: SensorUpdate, db: Session = Depends(get_db)) -> SensorRead:
    return update_sensor(db, sensor_id, payload)


@router.delete("/{sensor_id}", status_code=204)
def remove_sensor(sensor_id: int, db: Session = Depends(get_db)) -> None:
    delete_sensor(db, sensor_id)


@router.post("/{sensor_id}/test-read", response_model=SensorTestReadResult)
def test_read(sensor_id: int, db: Session = Depends(get_db)) -> SensorTestReadResult:
    return test_read_sensor(db, sensor_id)


@router.post("/{sensor_id}/archive", response_model=SensorRead)
def archive_existing_sensor(sensor_id: int, db: Session = Depends(get_db)) -> SensorRead:
    return archive_sensor(db, sensor_id)


@router.post("/{sensor_id}/restore", response_model=SensorRead)
def restore_existing_sensor(sensor_id: int, db: Session = Depends(get_db)) -> SensorRead:
    return restore_sensor(db, sensor_id)


@router.post("/{sensor_id}/duplicate", response_model=SensorRead)
def duplicate_existing_sensor(sensor_id: int, db: Session = Depends(get_db)) -> SensorRead:
    return duplicate_sensor(db, sensor_id)
