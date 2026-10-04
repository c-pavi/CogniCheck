"""Read-only researcher endpoints for browsing collected data.

These expose participant data with no authentication, so main.py only mounts
this router when ADMIN_ENABLED=true. Leave it off on any public deployment.
"""
import uuid
from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession, joinedload

from .. import models
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _storage_root() -> Path:
    return Path(settings.audio_storage_path).resolve()


def _audio_path(recording: models.Recording) -> Path | None:
    """Absolute path to a recording's audio, refusing anything outside storage."""
    root = _storage_root()
    path = (root / recording.file_path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        return None
    return path


def _transcript(audio_path: Path | None) -> str | None:
    """Plain-text transcript written by scripts/transcribe.py, if it exists."""
    if audio_path is None:
        return None
    txt = audio_path.with_suffix(".txt")
    return txt.read_text(encoding="utf-8").strip() if txt.is_file() else None


@router.get("/overview")
def overview(db: DBSession = Depends(get_db)):
    sessions = db.query(models.Session).all()
    recordings = db.query(models.Recording).all()

    def tally(field: str) -> dict[str, int]:
        return dict(Counter(getattr(s, field) or "not_given" for s in sessions))

    return {
        "study_codes": db.query(models.Participant).count(),
        "active_codes": db.query(models.Participant)
        .filter(models.Participant.sessions.any())
        .count(),
        "sessions": len(sessions),
        "completed_sessions": sum(1 for s in sessions if s.completed_at),
        "recordings": len(recordings),
        "recordings_by_test": dict(Counter(r.test_type for r in recordings)),
        "audio_seconds": sum(r.duration_sec for r in recordings),
        "age_band": tally("age_band"),
        "sex": tally("sex"),
        "primary_language": tally("primary_language"),
    }


@router.get("/sessions")
def list_sessions(db: DBSession = Depends(get_db)):
    sessions = (
        db.query(models.Session)
        .options(
            joinedload(models.Session.participant),
            joinedload(models.Session.recordings),
        )
        .order_by(models.Session.started_at.desc())
        .all()
    )
    out = []
    for s in sessions:
        recs = []
        for r in sorted(s.recordings, key=lambda r: r.started_at):
            audio = _audio_path(r)
            recs.append(
                {
                    "id": r.id,
                    "test_type": r.test_type,
                    "test_config": r.test_config,
                    "started_at": r.started_at,
                    "duration_sec": r.duration_sec,
                    "file_size_bytes": r.file_size_bytes,
                    "mic_device_label": r.mic_device_label,
                    "audio_available": audio is not None,
                    "transcript": _transcript(audio),
                }
            )
        out.append(
            {
                "id": s.id,
                "study_code": s.participant.study_code,
                "started_at": s.started_at,
                "completed_at": s.completed_at,
                "consent_version": s.consent_version,
                "age_band": s.age_band,
                "sex": s.sex,
                "education_years": s.education_years,
                "primary_language": s.primary_language,
                "recordings": recs,
            }
        )
    return out


@router.get("/recordings/{recording_id}/audio")
def recording_audio(recording_id: uuid.UUID, db: DBSession = Depends(get_db)):
    recording = db.get(models.Recording, recording_id)
    audio = _audio_path(recording) if recording else None
    if audio is None:
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio, media_type=recording.mime_type or "audio/webm")
