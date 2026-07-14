"""Thin CRUD service for SpoolAssignment (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.spool_assignment import SpoolAssignment
from app.schemas.spool_assignment import SpoolAssignmentCreate, SpoolAssignmentUpdate


def list_assignments(session: Session) -> list[SpoolAssignment]:
    return session.query(SpoolAssignment).order_by(SpoolAssignment.id.asc()).all()


def get_assignment_or_404(session: Session, assignment_id: int) -> SpoolAssignment:
    assignment = session.get(SpoolAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail=f"Spool assignment {assignment_id} not found.")
    return assignment


def _check_spool_exists(session: Session, spool_id: int) -> None:
    if session.get(FilamentSpool, spool_id) is None:
        raise HTTPException(status_code=404, detail=f"Filament spool {spool_id} not found.")


def _check_location_exists(session: Session, location_id: int) -> None:
    if session.get(Location, location_id) is None:
        raise HTTPException(status_code=404, detail=f"Location {location_id} not found.")


def create_assignment(session: Session, payload: SpoolAssignmentCreate) -> SpoolAssignment:
    data = payload.model_dump()
    _check_spool_exists(session, data["spool_id"])
    _check_location_exists(session, data["location_id"])
    if data.get("assigned_at") is None:
        data["assigned_at"] = utc_now()
    assignment = SpoolAssignment(**data)
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return assignment


def update_assignment(
    session: Session, assignment_id: int, payload: SpoolAssignmentUpdate
) -> SpoolAssignment:
    assignment = get_assignment_or_404(session, assignment_id)
    updates = payload.model_dump(exclude_unset=True)
    if "spool_id" in updates:
        _check_spool_exists(session, updates["spool_id"])
    if "location_id" in updates:
        _check_location_exists(session, updates["location_id"])
    for field, value in updates.items():
        setattr(assignment, field, value)
    session.commit()
    session.refresh(assignment)
    return assignment


def delete_assignment(session: Session, assignment_id: int) -> None:
    assignment = get_assignment_or_404(session, assignment_id)
    session.delete(assignment)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Spool assignment {assignment_id} cannot be deleted because it is referenced by other records.",
        ) from exc
