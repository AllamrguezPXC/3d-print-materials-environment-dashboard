"""Thin CRUD service for Printer (Requirements.md section 12.2)."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.location import Location
from app.models.printer import Printer
from app.schemas.printer import PrinterCreate, PrinterUpdate

VALID_FILAMENT_SYSTEM_TYPES = {"ams", "external_spool", "ams_external_spool", "storage_only", "manual"}
VALID_OPERATIONAL_STATUSES = {"activo", "inactivo", "mantenimiento"}

# Real-world Bambu Lab AMS slot count -- matches the seed data's P1S #1
# demo (4 slots) and the AmsSlotGrid layout. Not a schema-level assumption
# (slot_index is a generic ordinal), just what a Dashboard-driven "switch to
# AMS" ensures exists.
AMS_SLOT_COUNT = 4


def _validate_filament_system_type(value: str) -> None:
    if value not in VALID_FILAMENT_SYSTEM_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported filament_system_type {value!r}. Must be one of: "
                f"{', '.join(sorted(VALID_FILAMENT_SYSTEM_TYPES))}."
            ),
        )


def _validate_operational_status(value: str) -> None:
    if value not in VALID_OPERATIONAL_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unsupported operational_status {value!r}. Must be one of: "
                f"{', '.join(sorted(VALID_OPERATIONAL_STATUSES))}."
            ),
        )


def _ensure_ams_slots(session: Session, printer: Printer) -> None:
    existing_slots = {
        row.slot_index
        for row in session.query(Location.slot_index).filter(
            Location.printer_id == printer.id, Location.location_type == "printer_ams"
        )
    }
    for slot_index in range(AMS_SLOT_COUNT):
        if slot_index in existing_slots:
            continue
        session.add(
            Location(
                name=f"AMS Slot {slot_index + 1} - {printer.name}",
                location_type="printer_ams",
                printer_id=printer.id,
                slot_index=slot_index,
            )
        )


def _ensure_external_spool_location(session: Session, printer: Printer) -> None:
    has_external_spool = (
        session.query(Location.id)
        .filter(Location.printer_id == printer.id, Location.location_type == "printer_external_spool")
        .first()
        is not None
    )
    if not has_external_spool:
        session.add(
            Location(
                name=f"External Spool - {printer.name}",
                location_type="printer_external_spool",
                printer_id=printer.id,
            )
        )


def _sync_locations_for_filament_system_type(session: Session, printer: Printer, new_type: str) -> None:
    """Ensures the Location rows implied by a filament-system-type switch
    exist -- deliberately non-destructive: only ever creates rows that are
    missing, never deletes or modifies existing ones. This makes switching
    back and forth between ams/external_spool/ams_external_spool idempotent
    and safe (no risk of orphaning an active SpoolAssignment or Sensor by
    removing the Location it points to) -- a printer can end up with
    Locations of both types after several switches, which is exactly what
    ams_external_spool means, and is harmless even for a printer that hasn't
    been explicitly switched to that value. storage_only/manual leave
    Locations untouched.
    """
    if new_type == "ams":
        _ensure_ams_slots(session, printer)
    elif new_type == "external_spool":
        _ensure_external_spool_location(session, printer)
    elif new_type == "ams_external_spool":
        _ensure_ams_slots(session, printer)
        _ensure_external_spool_location(session, printer)
    # storage_only / manual: no Location changes -- these types never imply
    # a specific slot shape today.


def list_printers(session: Session) -> list[Printer]:
    return session.query(Printer).order_by(Printer.id.asc()).all()


def get_printer_or_404(session: Session, printer_id: int) -> Printer:
    printer = session.get(Printer, printer_id)
    if printer is None:
        raise HTTPException(status_code=404, detail=f"Printer {printer_id} not found.")
    return printer


def create_printer(session: Session, payload: PrinterCreate) -> Printer:
    _validate_filament_system_type(payload.filament_system_type)
    _validate_operational_status(payload.operational_status)
    printer = Printer(**payload.model_dump())
    session.add(printer)
    session.commit()
    session.refresh(printer)

    # A printer created directly with a non-manual/storage_only type must get
    # the same implied Location rows a later PATCH to that type would create
    # (see _sync_locations_for_filament_system_type) -- otherwise a new AMS
    # printer starts with zero slots until someone toggles its type back and
    # forth, which is exactly the inconsistency this UAT session caught live.
    _sync_locations_for_filament_system_type(session, printer, printer.filament_system_type)
    session.commit()
    session.refresh(printer)
    return printer


def update_printer(session: Session, printer_id: int, payload: PrinterUpdate) -> Printer:
    printer = get_printer_or_404(session, printer_id)
    updates = payload.model_dump(exclude_unset=True)
    if "filament_system_type" in updates:
        _validate_filament_system_type(updates["filament_system_type"])
    if "operational_status" in updates:
        _validate_operational_status(updates["operational_status"])

    filament_system_type_changed = (
        "filament_system_type" in updates and updates["filament_system_type"] != printer.filament_system_type
    )

    for field, value in updates.items():
        setattr(printer, field, value)

    if filament_system_type_changed:
        _sync_locations_for_filament_system_type(session, printer, printer.filament_system_type)

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
