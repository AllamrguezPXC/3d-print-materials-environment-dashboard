"""Thin CRUD service for FilamentSpool (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.filament_spool import FilamentSpool
from app.schemas.filament_spool import FilamentSpoolCreate, FilamentSpoolUpdate


def list_spools(session: Session) -> list[FilamentSpool]:
    return session.query(FilamentSpool).order_by(FilamentSpool.id.asc()).all()


def get_spool_or_404(session: Session, spool_id: int) -> FilamentSpool:
    spool = session.get(FilamentSpool, spool_id)
    if spool is None:
        raise HTTPException(status_code=404, detail=f"Filament spool {spool_id} not found.")
    return spool


def create_spool(session: Session, payload: FilamentSpoolCreate) -> FilamentSpool:
    spool = FilamentSpool(**payload.model_dump())
    session.add(spool)
    session.commit()
    session.refresh(spool)
    return spool


def update_spool(session: Session, spool_id: int, payload: FilamentSpoolUpdate) -> FilamentSpool:
    spool = get_spool_or_404(session, spool_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(spool, field, value)
    session.commit()
    session.refresh(spool)
    return spool


def delete_spool(session: Session, spool_id: int) -> None:
    spool = get_spool_or_404(session, spool_id)
    session.delete(spool)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                f"Filament spool {spool_id} cannot be deleted because it is referenced by other "
                "records (e.g. spool assignments)."
            ),
        ) from exc
