from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.spool_assignment import (
    SpoolAssignmentCreate,
    SpoolAssignmentRead,
    SpoolAssignmentUpdate,
)
from app.services.spool_assignment_service import (
    create_assignment,
    delete_assignment,
    list_assignments,
    update_assignment,
)

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=list[SpoolAssignmentRead])
@router.get("/", response_model=list[SpoolAssignmentRead], include_in_schema=False)
def list_all_assignments(db: Session = Depends(get_db)) -> list[SpoolAssignmentRead]:
    return list_assignments(db)


@router.post("", response_model=SpoolAssignmentRead)
@router.post("/", response_model=SpoolAssignmentRead, include_in_schema=False)
def create_new_assignment(
    payload: SpoolAssignmentCreate, db: Session = Depends(get_db)
) -> SpoolAssignmentRead:
    return create_assignment(db, payload)


@router.patch("/{assignment_id}", response_model=SpoolAssignmentRead)
def patch_assignment(
    assignment_id: int, payload: SpoolAssignmentUpdate, db: Session = Depends(get_db)
) -> SpoolAssignmentRead:
    return update_assignment(db, assignment_id, payload)


@router.delete("/{assignment_id}", status_code=204)
def remove_assignment(assignment_id: int, db: Session = Depends(get_db)) -> None:
    delete_assignment(db, assignment_id)
