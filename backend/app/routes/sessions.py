"""Endpoints for creating and completing participant sessions."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/", response_model=schemas.SessionResponse)
def create_session(payload: schemas.SessionCreate, db: DBSession = Depends(get_db)):
    """Create a session bound to a valid study code, capturing consent + demographics."""
    code = payload.study_code.strip().upper()
    participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.study_code == code,
            models.Participant.is_active.is_(True),
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Invalid or inactive study code")

    session = models.Session(
        participant_id=participant.id,
        consent_version=payload.consent_version,
        consent_accepted_at=datetime.now(timezone.utc),
        user_agent=payload.user_agent,
        age_band=payload.demographics.age_band,
        sex=payload.demographics.sex,
        education_years=payload.demographics.education_years,
        primary_language=payload.demographics.primary_language,
        hearing_status=payload.demographics.hearing_status,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return schemas.SessionResponse(session_id=session.id)


@router.post("/{session_id}/complete", response_model=schemas.SessionComplete)
def complete_session(session_id: UUID, db: DBSession = Depends(get_db)):
    """Mark a session as completed (participant reached the thank-you screen)."""
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.completed_at = datetime.now(timezone.utc)
    db.commit()
    return schemas.SessionComplete(completed=True)
