"""Thin CRUD service for Printer (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.printer import Printer
from app.schemas.printer import PrinterCreate, PrinterUpdate

VALID_FILAMENT_SYSTEM_TYPES = {"ams", "external_spool", "storage_only", "manual"}


def _validate_filament_system_type(value: str) -> None:
    if value not in VALID_FILAMENT_SYSTEM_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported filament_system_type {value!r}. Must be one of: "
                f"{', '.join(sorted(VALID_FILAMENT_SYSTEM_TYPES))}."
            ),
        )


def list_printers(session: Session) -> list[Printer]:
    return session.query(Printer).order_by(Printer.id.asc()).all()


def get_printer_or_404(session: Session, printer_id: int) -> Printer:
    printer = session.get(Printer, printer_id)
    if printer is None:
        raise HTTPException(status_code=404, detail=f"Printer {printer_id} not found.")
    return printer


def create_printer(session: Session, payload: PrinterCreate) -> Printer:
    _validate_filament_system_type(payload.filament_system_type)
    printer = Printer(**payload.model_dump())
    session.add(printer)
    session.commit()
    session.refresh(printer)
    return printer


def update_printer(session: Session, printer_id: int, payload: PrinterUpdate) -> Printer:
    printer = get_printer_or_404(session, printer_id)
    updates = payload.model_dump(exclude_unset=True)
    if "filament_system_type" in updates:
        _validate_filament_system_type(updates["filament_system_type"])
    for field, value in updates.items():
        setattr(printer, field, value)
    session.commit()
    session.refresh(printer)
    return printer


def delete_printer(session: Session, printer_id: int) -> None:
    printer = get_printer_or_404(session, printer_id)
    session.delete(printer)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Printer {printer_id} cannot be deleted because it is referenced by other records (e.g. locations).",
        ) from exc
