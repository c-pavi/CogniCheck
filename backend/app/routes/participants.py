"""Endpoints for participant / study code operations."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/participants", tags=["participants"])


@router.post("/check", response_model=schemas.StudyCodeValid)
def check_code(payload: schemas.StudyCodeCheck, db: DBSession = Depends(get_db)):
    """Validate a study code. Returns whether it exists and is active."""
    code = payload.study_code.strip().upper()
    participant = (
        db.query(models.Participant)
        .filter(
            models.Participant.study_code == code,
            models.Participant.is_active.is_(True),
        )
        .first()
    )
    if participant:
        return schemas.StudyCodeValid(valid=True, participant_id=participant.id)
    return schemas.StudyCodeValid(valid=False)
