"""Thin CRUD service for FilamentSpool (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.filament_spool import FilamentSpool
from app.models.material_profile import MaterialProfile
from app.schemas.filament_spool import FilamentSpoolCreate, FilamentSpoolUpdate


def list_spools(session: Session, deleted_only: bool = False) -> list[FilamentSpool]:
    query = session.query(FilamentSpool).order_by(FilamentSpool.id.asc())
    if deleted_only:
        return query.filter(FilamentSpool.deleted_at.is_not(None)).all()
    return query.filter(FilamentSpool.deleted_at.is_(None)).all()


def get_spool_or_404(session: Session, spool_id: int) -> FilamentSpool:
    spool = session.get(FilamentSpool, spool_id)
    if spool is None or spool.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Filament spool {spool_id} not found.")
    return spool


def _get_spool_including_deleted_or_404(session: Session, spool_id: int) -> FilamentSpool:
    spool = session.get(FilamentSpool, spool_id)
    if spool is None:
        raise HTTPException(status_code=404, detail=f"Filament spool {spool_id} not found.")
    return spool


def _check_material_profile_exists(session: Session, material_profile_id: int) -> None:
    material = session.get(MaterialProfile, material_profile_id)
    if material is None or material.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Material profile {material_profile_id} not found.")


def create_spool(session: Session, payload: FilamentSpoolCreate) -> FilamentSpool:
    fields = payload.model_dump()
    _check_material_profile_exists(session, fields["material_profile_id"])
    spool = FilamentSpool(**fields)
    session.add(spool)
    session.commit()
    session.refresh(spool)
    return spool


def update_spool(session: Session, spool_id: int, payload: FilamentSpoolUpdate) -> FilamentSpool:
    spool = get_spool_or_404(session, spool_id)
    updates = payload.model_dump(exclude_unset=True)
    if "material_profile_id" in updates:
        _check_material_profile_exists(session, updates["material_profile_id"])
    for field, value in updates.items():
        setattr(spool, field, value)
    session.commit()
    session.refresh(spool)
    return spool


def delete_spool(session: Session, spool_id: int) -> None:
    """Permanent removal -- used only from the Trash view."""
    spool = _get_spool_including_deleted_or_404(session, spool_id)
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


def archive_spool(session: Session, spool_id: int) -> FilamentSpool:
    spool = get_spool_or_404(session, spool_id)
    spool.deleted_at = utc_now()
    session.commit()
    session.refresh(spool)
    return spool


def restore_spool(session: Session, spool_id: int) -> FilamentSpool:
    spool = _get_spool_including_deleted_or_404(session, spool_id)
    spool.deleted_at = None
    session.commit()
    session.refresh(spool)
    return spool


def duplicate_spool(session: Session, spool_id: int) -> FilamentSpool:
    """Copies a spool's configuration as a starting template -- e.g. "I bought
    another identical roll." No name field to suffix, so this is a direct
    copy of all fields."""
    spool = get_spool_or_404(session, spool_id)
    payload = FilamentSpoolCreate(
        material_profile_id=spool.material_profile_id,
        brand=spool.brand,
        color=spool.color,
        diameter_mm=spool.diameter_mm,
        initial_weight_g=spool.initial_weight_g,
        remaining_weight_g=spool.remaining_weight_g,
        quantity_label=spool.quantity_label,
        purchase_date=spool.purchase_date,
        opened_at=spool.opened_at,
        last_dried_at=spool.last_dried_at,
        status=spool.status,
    )
    return create_spool(session, payload)
