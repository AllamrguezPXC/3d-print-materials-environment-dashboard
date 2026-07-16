from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.printer import PrinterCreate, PrinterRead, PrinterUpdate
from app.services.printer_service import (
    archive_printer,
    create_printer,
    delete_printer,
    duplicate_printer,
    get_printer_or_404,
    list_printers,
    restore_printer,
    update_printer,
)

router = APIRouter(prefix="/printers", tags=["printers"])


@router.get("", response_model=list[PrinterRead])
@router.get("/", response_model=list[PrinterRead], include_in_schema=False)
def list_all_printers(deleted_only: bool = False, db: Session = Depends(get_db)) -> list[PrinterRead]:
    return list_printers(db, deleted_only=deleted_only)


@router.post("", response_model=PrinterRead)
@router.post("/", response_model=PrinterRead, include_in_schema=False)
def create_new_printer(payload: PrinterCreate, db: Session = Depends(get_db)) -> PrinterRead:
    return create_printer(db, payload)


@router.get("/{printer_id}", response_model=PrinterRead)
def get_printer(printer_id: int, db: Session = Depends(get_db)) -> PrinterRead:
    return get_printer_or_404(db, printer_id)


@router.patch("/{printer_id}", response_model=PrinterRead)
def patch_printer(printer_id: int, payload: PrinterUpdate, db: Session = Depends(get_db)) -> PrinterRead:
    return update_printer(db, printer_id, payload)


@router.delete("/{printer_id}", status_code=204)
def remove_printer(printer_id: int, db: Session = Depends(get_db)) -> None:
    delete_printer(db, printer_id)


@router.post("/{printer_id}/archive", response_model=PrinterRead)
def archive_existing_printer(printer_id: int, db: Session = Depends(get_db)) -> PrinterRead:
    return archive_printer(db, printer_id)


@router.post("/{printer_id}/restore", response_model=PrinterRead)
def restore_existing_printer(printer_id: int, db: Session = Depends(get_db)) -> PrinterRead:
    return restore_printer(db, printer_id)


@router.post("/{printer_id}/duplicate", response_model=PrinterRead)
def duplicate_existing_printer(printer_id: int, db: Session = Depends(get_db)) -> PrinterRead:
    return duplicate_printer(db, printer_id)
