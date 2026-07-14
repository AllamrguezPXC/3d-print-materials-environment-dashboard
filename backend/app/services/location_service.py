"""Thin CRUD service for Location (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.location import Location
from app.models.printer import Printer
from app.schemas.location import LocationCreate, LocationUpdate


def list_locations(session: Session) -> list[Location]:
    return session.query(Location).order_by(Location.id.asc()).all()


def get_location_or_404(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found.")
    return location


def _check_printer_exists(session: Session, printer_id: int | None) -> None:
    if printer_id is None:
        return
    if session.get(Printer, printer_id) is None:
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
    location = get_location_or_404(session, location_id)
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
