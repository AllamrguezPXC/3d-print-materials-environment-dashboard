from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.material_profile import (
    MaterialProfileCreate,
    MaterialProfileRead,
    MaterialProfileUpdate,
)
from app.services.material_profile_service import (
    create_material_profile,
    delete_material_profile,
    get_material_profile_or_404,
    list_material_profiles,
    update_material_profile,
)

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialProfileRead])
@router.get("/", response_model=list[MaterialProfileRead], include_in_schema=False)
def list_all_materials(db: Session = Depends(get_db)) -> list[MaterialProfileRead]:
    return list_material_profiles(db)


@router.post("", response_model=MaterialProfileRead)
@router.post("/", response_model=MaterialProfileRead, include_in_schema=False)
def create_new_material(payload: MaterialProfileCreate, db: Session = Depends(get_db)) -> MaterialProfileRead:
    return create_material_profile(db, payload)


@router.get("/{material_id}", response_model=MaterialProfileRead)
def get_material(material_id: int, db: Session = Depends(get_db)) -> MaterialProfileRead:
    return get_material_profile_or_404(db, material_id)


@router.patch("/{material_id}", response_model=MaterialProfileRead)
def patch_material(
    material_id: int, payload: MaterialProfileUpdate, db: Session = Depends(get_db)
) -> MaterialProfileRead:
    return update_material_profile(db, material_id, payload)


@router.delete("/{material_id}", status_code=204)
def remove_material(material_id: int, db: Session = Depends(get_db)) -> None:
    delete_material_profile(db, material_id)
