"""Endpoint for uploading audio recordings with test metadata."""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session as DBSession

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/api/recordings", tags=["recordings"])


def _parse_iso(value: str) -> datetime:
    """Parse an ISO 8601 timestamp, tolerating trailing 'Z' for UTC."""
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


@router.post("/", response_model=schemas.RecordingResponse)
async def upload_recording(
    session_id: str = Form(...),
    metadata: str = Form(...),
    audio: UploadFile = File(...),
    db: DBSession = Depends(get_db),
):
    """Accept a multipart upload with the audio blob and a JSON metadata string.

    The frontend sends metadata as a JSON string because multipart form fields
    can't natively hold nested JSON. Fields: test_type, started_at, completed_at,
    duration_sec, mime_type, sample_rate_hz, mic_device_label, test_config.
    """
    # Validate session
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    session = db.query(models.Session).filter(models.Session.id == session_uuid).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Parse metadata JSON
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")

    required = {"test_type", "started_at", "completed_at", "duration_sec"}
    missing = required - meta.keys()
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required metadata fields: {sorted(missing)}",
        )

    # Persist file to disk. Path structure is self-documenting so the
    # filesystem can be inspected without touching the database:
    #   <AUDIO_STORAGE>/<study_code>/<session_id>/<test_type>_<recording_id>.webm
    recording_id = uuid.uuid4()
    study_code = session.participant.study_code
    test_type = meta["test_type"]
    session_dir = Path(settings.audio_storage_path) / study_code / str(session.id)
    session_dir.mkdir(parents=True, exist_ok=True)
    file_path = session_dir / f"{test_type}_{recording_id}.webm"

    contents = await audio.read()
    file_path.write_bytes(contents)

    # Insert DB row
    recording = models.Recording(
        id=recording_id,
        session_id=session.id,
        test_type=meta["test_type"],
        test_config=meta.get("test_config") or {},
        started_at=_parse_iso(meta["started_at"]),
        completed_at=_parse_iso(meta["completed_at"]),
        duration_sec=int(meta["duration_sec"]),
        file_path=str(file_path.relative_to(settings.audio_storage_path)),
        file_size_bytes=len(contents),
        mime_type=meta.get("mime_type"),
        sample_rate_hz=meta.get("sample_rate_hz"),
        mic_device_label=meta.get("mic_device_label"),
        upload_status="complete",
        upload_completed_at=datetime.now(timezone.utc),
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    return schemas.RecordingResponse(
        recording_id=recording.id,
        upload_status=recording.upload_status,
    )
