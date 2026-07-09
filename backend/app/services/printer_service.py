"""Thin CRUD service for Printer (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.printer import Printer
from app.schemas.printer import PrinterCreate, PrinterUpdate


def list_printers(session: Session) -> list[Printer]:
    return session.query(Printer).order_by(Printer.id.asc()).all()


def get_printer_or_404(session: Session, printer_id: int) -> Printer:
    printer = session.get(Printer, printer_id)
    if printer is None:
        raise HTTPException(status_code=404, detail=f"Printer {printer_id} not found.")
    return printer


def create_printer(session: Session, payload: PrinterCreate) -> Printer:
    printer = Printer(**payload.model_dump())
    session.add(printer)
    session.commit()
    session.refresh(printer)
    return printer


def update_printer(session: Session, printer_id: int, payload: PrinterUpdate) -> Printer:
    printer = get_printer_or_404(session, printer_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
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
