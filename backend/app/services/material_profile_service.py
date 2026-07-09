"""Thin CRUD service for MaterialProfile (Requirements.md section 12.2).

Reuses the existing app.schemas.material_profile schemas (MaterialProfileCreate/
Update/Read); this module only adds the CRUD operations against the ORM.
"""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.material_profile import MaterialProfile
from app.schemas.material_profile import MaterialProfileCreate, MaterialProfileUpdate


def list_material_profiles(session: Session) -> list[MaterialProfile]:
    return session.query(MaterialProfile).order_by(MaterialProfile.id.asc()).all()


def get_material_profile_or_404(session: Session, material_id: int) -> MaterialProfile:
    profile = session.get(MaterialProfile, material_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Material profile {material_id} not found.")
    return profile


def create_material_profile(session: Session, payload: MaterialProfileCreate) -> MaterialProfile:
    profile = MaterialProfile(**payload.model_dump())
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def update_material_profile(
    session: Session, material_id: int, payload: MaterialProfileUpdate
) -> MaterialProfile:
    profile = get_material_profile_or_404(session, material_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
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
