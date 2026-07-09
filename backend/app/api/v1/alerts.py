from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.alert import AlertRead, AlertResolveResponse
from app.services.alert_admin_service import list_alerts, resolve_alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
@router.get("/", response_model=list[AlertRead], include_in_schema=False)
def list_all_alerts(
    is_active: bool | None = None,
    severity: str | None = None,
    location_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[AlertRead]:
    return list_alerts(db, is_active=is_active, severity=severity, location_id=location_id)


@router.patch("/{alert_id}/resolve", response_model=AlertResolveResponse)
def resolve_existing_alert(alert_id: int, db: Session = Depends(get_db)) -> AlertResolveResponse:
    alert = resolve_alert(db, alert_id)
    return AlertResolveResponse(alert=AlertRead.model_validate(alert))
