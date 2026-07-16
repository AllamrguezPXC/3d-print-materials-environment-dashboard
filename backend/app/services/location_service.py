"""Thin CRUD service for Location (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.location import Location
from app.models.printer import Printer
from app.schemas.location import LocationCreate, LocationUpdate


def list_locations(session: Session, deleted_only: bool = False) -> list[Location]:
    query = session.query(Location).order_by(Location.id.asc())
    if deleted_only:
        return query.filter(Location.deleted_at.is_not(None)).all()
    return query.filter(Location.deleted_at.is_(None)).all()


def get_location_or_404(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if location is None or location.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found.")
    return location


def _get_location_including_deleted_or_404(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found.")
    return location


def _check_printer_exists(session: Session, printer_id: int | None) -> None:
    if printer_id is None:
        return
    printer = session.get(Printer, printer_id)
    if printer is None or printer.deleted_at is not None:
        raise HTTPException(status_code=404, detail=f"Printer {printer_id} not found.")


def create_location(session: Session, payload: LocationCreate) -> Location:
    fields = payload.model_dump()
    _check_printer_exists(session, fields.get("printer_id"))
    location = Location(**fields)
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


def update_location(session: Session, location_id: int, payload: LocationUpdate) -> Location:
    location = get_location_or_404(session, location_id)
    updates = payload.model_dump(exclude_unset=True)
    if "printer_id" in updates:
        _check_printer_exists(session, updates["printer_id"])
    for field, value in updates.items():
        setattr(location, field, value)
    session.commit()
    session.refresh(location)
    return location


def delete_location(session: Session, location_id: int) -> None:
    """Permanent removal -- used only from the Trash view."""
    location = _get_location_including_deleted_or_404(session, location_id)
    session.delete(location)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                f"Location {location_id} cannot be deleted because it is referenced by other records "
                "(e.g. sensors, readings, or spool assignments)."
            ),
        ) from exc


def archive_location(session: Session, location_id: int) -> Location:
    location = get_location_or_404(session, location_id)
    location.deleted_at = utc_now()
    session.commit()
    session.refresh(location)
    return location


def restore_location(session: Session, location_id: int) -> Location:
    location = _get_location_including_deleted_or_404(session, location_id)
    location.deleted_at = None
    session.commit()
    session.refresh(location)
    return location


def duplicate_location(session: Session, location_id: int) -> Location:
    """Copies a location's own configuration as a template, including a
    dryer's max_temp_c capability -- useful for adding a second identical
    dryer/storage box without retyping its settings."""
    location = get_location_or_404(session, location_id)
    payload = LocationCreate(
        name=f"{location.name} (Copy)",
        location_type=location.location_type,
        printer_id=location.printer_id,
        description=location.description,
        max_temp_c=location.max_temp_c,
        notes=location.notes,
        slot_index=location.slot_index,
    )
    return create_location(session, payload)
