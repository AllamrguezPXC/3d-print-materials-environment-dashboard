from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.reading import CurrentReadingResponse
from app.services.environment_service import build_current_reading

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("/current", response_model=CurrentReadingResponse)
def get_current_reading(settings: Settings = Depends(get_settings)) -> CurrentReadingResponse:
    return build_current_reading(settings)
