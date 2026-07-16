from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.location import LocationCreate, LocationRead, LocationUpdate
from app.services.location_service import (
    archive_location,
    create_location,
    delete_location,
    duplicate_location,
    get_location_or_404,
    list_locations,
    restore_location,
    update_location,
)

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
@router.get("/", response_model=list[LocationRead], include_in_schema=False)
def list_all_locations(deleted_only: bool = False, db: Session = Depends(get_db)) -> list[LocationRead]:
    return list_locations(db, deleted_only=deleted_only)


@router.post("", response_model=LocationRead)
@router.post("/", response_model=LocationRead, include_in_schema=False)
def create_new_location(payload: LocationCreate, db: Session = Depends(get_db)) -> LocationRead:
    return create_location(db, payload)


@router.get("/{location_id}", response_model=LocationRead)
def get_location(location_id: int, db: Session = Depends(get_db)) -> LocationRead:
    return get_location_or_404(db, location_id)


@router.patch("/{location_id}", response_model=LocationRead)
def patch_location(location_id: int, payload: LocationUpdate, db: Session = Depends(get_db)) -> LocationRead:
    return update_location(db, location_id, payload)


@router.delete("/{location_id}", status_code=204)
def remove_location(location_id: int, db: Session = Depends(get_db)) -> None:
    delete_location(db, location_id)


@router.post("/{location_id}/archive", response_model=LocationRead)
def archive_existing_location(location_id: int, db: Session = Depends(get_db)) -> LocationRead:
    return archive_location(db, location_id)


@router.post("/{location_id}/restore", response_model=LocationRead)
def restore_existing_location(location_id: int, db: Session = Depends(get_db)) -> LocationRead:
    return restore_location(db, location_id)


@router.post("/{location_id}/duplicate", response_model=LocationRead)
def duplicate_existing_location(location_id: int, db: Session = Depends(get_db)) -> LocationRead:
    return duplicate_location(db, location_id)
