"""Thin query/administration service for Alert (Requirements.md section 12.2).

Kept separate from app.services.alert_service, which builds/evaluates alert
drafts for POST /readings and GET /readings/current. This module only lists
existing alerts and resolves them for the GET /alerts and
PATCH /alerts/{alert_id}/resolve endpoints.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.alert import Alert


def list_alerts(
    session: Session,
    is_active: bool | None = None,
    severity: str | None = None,
    location_id: int | None = None,
) -> list[Alert]:
    query = session.query(Alert)
    if is_active is not None:
        query = query.filter(Alert.is_active.is_(is_active))
    if severity is not None:
        query = query.filter(Alert.severity == severity)
    if location_id is not None:
        query = query.filter(Alert.location_id == location_id)
    return query.order_by(Alert.created_at.desc()).all()


def get_alert_or_404(session: Session, alert_id: int) -> Alert:
    alert = session.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    return alert


def resolve_alert(session: Session, alert_id: int) -> Alert:
    alert = get_alert_or_404(session, alert_id)
    alert.is_active = False
    alert.resolved_at = utc_now()
    session.commit()
    session.refresh(alert)
    return alert
