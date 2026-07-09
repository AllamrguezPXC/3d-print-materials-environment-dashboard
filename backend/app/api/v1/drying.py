from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.drying import (
    DryingRecommendation,
    DryingSessionCreate,
    DryingSessionRead,
    DryingSessionUpdate,
)
from app.services import drying_service

router = APIRouter(prefix="/drying", tags=["drying"])


@router.get("/recommendations", response_model=list[DryingRecommendation])
def get_recommendations(db: Session = Depends(get_db)) -> list[DryingRecommendation]:
    return drying_service.get_drying_recommendations(db)


@router.post("/sessions", response_model=DryingSessionRead)
def create_session(payload: DryingSessionCreate, db: Session = Depends(get_db)) -> DryingSessionRead:
    return drying_service.create_drying_session(db, payload)


@router.get("/sessions", response_model=list[DryingSessionRead])
def list_sessions(
    spool_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
) -> list[DryingSessionRead]:
    return drying_service.list_drying_sessions(db, spool_id=spool_id, status=status)


@router.patch("/sessions/{session_id}", response_model=DryingSessionRead)
def update_session(
    session_id: int,
    payload: DryingSessionUpdate,
    db: Session = Depends(get_db),
) -> DryingSessionRead:
    drying_session = drying_service.update_drying_session(db, session_id, payload)
    if drying_session is None:
        raise HTTPException(status_code=404, detail=f"Drying session {session_id} not found.")
    return drying_session
