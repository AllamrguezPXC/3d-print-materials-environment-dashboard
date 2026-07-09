from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SpoolAssignmentBase(BaseModel):
    spool_id: int
    location_id: int
    slot_name: str | None = None
    is_active: bool = True
    assigned_at: datetime | None = None
    removed_at: datetime | None = None


class SpoolAssignmentCreate(SpoolAssignmentBase):
    pass


class SpoolAssignmentUpdate(BaseModel):
    spool_id: int | None = None
    location_id: int | None = None
    slot_name: str | None = None
    is_active: bool | None = None
    assigned_at: datetime | None = None
    removed_at: datetime | None = None


class SpoolAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spool_id: int
    location_id: int
    slot_name: str | None = None
    is_active: bool
    assigned_at: datetime
    removed_at: datetime | None = None
