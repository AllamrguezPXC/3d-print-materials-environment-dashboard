from pydantic import BaseModel, ConfigDict


class LocationBase(BaseModel):
    name: str
    location_type: str  # printer_ams, printer_external_spool, storage_box, dry_box, dryer, room
    printer_id: int | None = None
    description: str | None = None
    max_temp_c: float | None = None
    notes: str | None = None
    slot_index: int | None = None  # only meaningful for location_type == "printer_ams"


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = None
    location_type: str | None = None
    printer_id: int | None = None
    description: str | None = None
    max_temp_c: float | None = None
    notes: str | None = None
    slot_index: int | None = None


class LocationRead(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
