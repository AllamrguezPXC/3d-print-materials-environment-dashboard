"""Thin CRUD service for MaterialProfile (Requirements.md section 12.2).

Reuses the existing app.schemas.material_profile schemas (MaterialProfileCreate/
Update/Read); this module only adds the CRUD operations against the ORM.
"""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.material_profile import MaterialProfile
from app.schemas.material_profile import MaterialProfileCreate, MaterialProfileUpdate

# Fields evaluate_humidity_severity/evaluate_temperature_severity (alert_service.py)
# compare a reading against, in this order (Requirements.md section 8). Nonsensical
# ordering here (e.g. a critical threshold lower than the ideal one) silently
# inverts that severity logic rather than raising anywhere, so it's rejected here
# instead of trusted to the caller.
_THRESHOLD_FIELDS = (
    "ideal_rh_max_percent",
    "warning_rh_max_percent",
    "critical_rh_max_percent",
    "ideal_temp_min_c",
    "ideal_temp_max_c",
    "warning_temp_min_c",
    "warning_temp_max_c",
    "critical_temp_min_c",
    "critical_temp_max_c",
    "drying_time_hours_min",
    "drying_time_hours_max",
)


def _validate_thresholds(values: dict[str, float]) -> None:
    if not (
        0
        <= values["ideal_rh_max_percent"]
        <= values["warning_rh_max_percent"]
        <= values["critical_rh_max_percent"]
        <= 100
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Humidity thresholds must satisfy 0 <= ideal_rh_max_percent <= "
                "warning_rh_max_percent <= critical_rh_max_percent <= 100."
            ),
        )
    for range_name in ("ideal", "warning", "critical"):
        min_value = values[f"{range_name}_temp_min_c"]
        max_value = values[f"{range_name}_temp_max_c"]
        if min_value > max_value:
            raise HTTPException(
                status_code=422,
                detail=f"{range_name}_temp_min_c must be <= {range_name}_temp_max_c.",
            )
    if values["drying_time_hours_min"] > values["drying_time_hours_max"]:
        raise HTTPException(
            status_code=422,
            detail="drying_time_hours_min must be <= drying_time_hours_max.",
        )


def list_material_profiles(session: Session) -> list[MaterialProfile]:
    return session.query(MaterialProfile).order_by(MaterialProfile.id.asc()).all()


def get_material_profile_or_404(session: Session, material_id: int) -> MaterialProfile:
    profile = session.get(MaterialProfile, material_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Material profile {material_id} not found.")
    return profile


def create_material_profile(session: Session, payload: MaterialProfileCreate) -> MaterialProfile:
    fields = payload.model_dump()
    _validate_thresholds({key: fields[key] for key in _THRESHOLD_FIELDS})
    profile = MaterialProfile(**fields)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def update_material_profile(
    session: Session, material_id: int, payload: MaterialProfileUpdate
) -> MaterialProfile:
    profile = get_material_profile_or_404(session, material_id)
    updates = payload.model_dump(exclude_unset=True)
    merged = {key: updates.get(key, getattr(profile, key)) for key in _THRESHOLD_FIELDS}
    _validate_thresholds(merged)
    for field, value in updates.items():
        setattr(profile, field, value)
    session.commit()
    session.refresh(profile)
    return profile


def delete_material_profile(session: Session, material_id: int) -> None:
    profile = get_material_profile_or_404(session, material_id)
    session.delete(profile)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                f"Material profile {material_id} cannot be deleted because it is referenced by "
                "existing filament spools."
            ),
        ) from exc
