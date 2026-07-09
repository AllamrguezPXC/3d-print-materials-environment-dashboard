from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class DryingRecommendation(BaseModel):
    """
    <summary>
    Advisory drying recommendation for a FilamentSpool currently in
    warning/critical humidity status at its assigned Location. Per
    Requirements.md section 9, this is guidance only — the app never
    implies direct/automatic control of a physical dryer.
    </summary>
    """

    spool_id: int
    material_profile_name: str
    current_status: Literal["ok", "warning", "critical"]
    drying_temp_c: float
    drying_time_hours_min: float
    drying_time_hours_max: float
    dryer_location_id: int | None = None
    dryer_capability_ok: bool | None = None
    dryer_max_temp_c: float | None = None
    message: str


class DryingSessionCreate(BaseModel):
    """Request body for POST /drying/sessions."""

    spool_id: int
    dryer_location_id: int
    sensor_id: int | None = None
    target_temp_c: float
    target_duration_hours: float


class DryingSessionUpdate(BaseModel):
    """Partial update body for PATCH /drying/sessions/{session_id}."""

    status: Literal["recommended", "running", "completed", "failed", "cancelled"] | None = None
    ended_at: datetime | None = None
    validation_notes: str | None = None


class DryingSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spool_id: int
    dryer_location_id: int
    sensor_id: int | None
    target_temp_c: float
    target_duration_hours: float
    started_at: datetime
    ended_at: datetime | None
    status: str
    validation_notes: str | None
