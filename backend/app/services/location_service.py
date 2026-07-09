"""Thin CRUD service for Location (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate


def list_locations(session: Session) -> list[Location]:
    return session.query(Location).order_by(Location.id.asc()).all()


def get_location_or_404(session: Session, location_id: int) -> Location:
    location = session.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found.")
    return location


def create_location(session: Session, payload: LocationCreate) -> Location:
    location = Location(**payload.model_dump())
    session.add(location)
    session.commit()
    session.refresh(location)
    return location


def update_location(session: Session, location_id: int, payload: LocationUpdate) -> Location:
    location = get_location_or_404(session, location_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
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
