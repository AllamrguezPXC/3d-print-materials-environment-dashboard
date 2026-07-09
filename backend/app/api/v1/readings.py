from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.time import parse_iso_datetime
from app.db.session import get_db
from app.schemas.reading import (
    CurrentReadingResponse,
    ReadingCreate,
    ReadingCreateResponse,
    ReadingsHistoryResponse,
)
from app.services.environment_service import build_current_reading
from app.services.reading_service import (
    capture_and_persist_reading,
    get_readings_history,
    persist_manual_reading,
)

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("/current", response_model=CurrentReadingResponse)
def get_current_reading(
    include_alerts: bool = True,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> CurrentReadingResponse:
    return build_current_reading(settings, session=db, include_alerts=include_alerts)


@router.post("", response_model=ReadingCreateResponse)
@router.post("/", response_model=ReadingCreateResponse, include_in_schema=False)
def create_reading(
    payload: ReadingCreate | None = None,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> ReadingCreateResponse:
    if payload is None:
        return capture_and_persist_reading(db, settings)
    return persist_manual_reading(db, payload)


@router.get("", response_model=ReadingsHistoryResponse)
@router.get("/", response_model=ReadingsHistoryResponse, include_in_schema=False)
def list_readings(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    sensor_id: int | None = None,
    location_id: int | None = None,
    aggregate: str = Query("none", pattern="^(none|hour)$"),
    db: Session = Depends(get_db),
) -> ReadingsHistoryResponse:
    try:
        from_dt = parse_iso_datetime(from_)
        to_dt = parse_iso_datetime(to)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid ISO datetime: {exc}") from exc

    readings, hourly = get_readings_history(
        db, from_dt, to_dt, sensor_id=sensor_id, location_id=location_id, aggregate=aggregate
    )
    return ReadingsHistoryResponse(readings=readings, hourly=hourly)
