from pydantic import BaseModel, ConfigDict


class PrinterBase(BaseModel):
    name: str
    brand: str
    model: str
    serial_number: str | None = None
    notes: str | None = None
    filament_system_type: str = "manual"  # ams, external_spool, storage_only, manual


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    notes: str | None = None
    filament_system_type: str | None = None


class PrinterRead(PrinterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
