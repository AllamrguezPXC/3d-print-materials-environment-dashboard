from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.printer import PrinterCreate, PrinterRead, PrinterUpdate
from app.services.printer_service import (
    create_printer,
    delete_printer,
    get_printer_or_404,
    list_printers,
    update_printer,
)

router = APIRouter(prefix="/printers", tags=["printers"])


@router.get("", response_model=list[PrinterRead])
@router.get("/", response_model=list[PrinterRead], include_in_schema=False)
def list_all_printers(db: Session = Depends(get_db)) -> list[PrinterRead]:
    return list_printers(db)


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
