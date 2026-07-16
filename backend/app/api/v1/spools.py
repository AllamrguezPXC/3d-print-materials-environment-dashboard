from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.filament_spool import FilamentSpoolCreate, FilamentSpoolRead, FilamentSpoolUpdate
from app.services.filament_spool_service import (
    archive_spool,
    create_spool,
    delete_spool,
    duplicate_spool,
    get_spool_or_404,
    list_spools,
    restore_spool,
    update_spool,
)

router = APIRouter(prefix="/spools", tags=["spools"])


@router.get("", response_model=list[FilamentSpoolRead])
@router.get("/", response_model=list[FilamentSpoolRead], include_in_schema=False)
def list_all_spools(deleted_only: bool = False, db: Session = Depends(get_db)) -> list[FilamentSpoolRead]:
    return list_spools(db, deleted_only=deleted_only)


@router.post("", response_model=FilamentSpoolRead)
@router.post("/", response_model=FilamentSpoolRead, include_in_schema=False)
def create_new_spool(payload: FilamentSpoolCreate, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return create_spool(db, payload)


@router.get("/{spool_id}", response_model=FilamentSpoolRead)
def get_spool(spool_id: int, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return get_spool_or_404(db, spool_id)


@router.patch("/{spool_id}", response_model=FilamentSpoolRead)
def patch_spool(spool_id: int, payload: FilamentSpoolUpdate, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return update_spool(db, spool_id, payload)


@router.delete("/{spool_id}", status_code=204)
def remove_spool(spool_id: int, db: Session = Depends(get_db)) -> None:
    delete_spool(db, spool_id)


@router.post("/{spool_id}/archive", response_model=FilamentSpoolRead)
def archive_existing_spool(spool_id: int, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return archive_spool(db, spool_id)


@router.post("/{spool_id}/restore", response_model=FilamentSpoolRead)
def restore_existing_spool(spool_id: int, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return restore_spool(db, spool_id)


@router.post("/{spool_id}/duplicate", response_model=FilamentSpoolRead)
def duplicate_existing_spool(spool_id: int, db: Session = Depends(get_db)) -> FilamentSpoolRead:
    return duplicate_spool(db, spool_id)
