"""Read-only researcher endpoints for browsing collected data.

Every request must send the dashboard password as `Authorization: Bearer
<ADMIN_TOKEN>`. main.py only mounts this router when ADMIN_TOKEN is set.
"""
import csv
import io
import json
import secrets
import tempfile
import uuid
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy.orm import Session as DBSession, joinedload

from .. import models
from ..config import settings
from ..database import get_db


def require_admin(authorization: str = Header(default="")) -> None:
    scheme, _, token = authorization.partition(" ")
    expected = settings.admin_token
    if not (
        expected
        and scheme.lower() == "bearer"
        and secrets.compare_digest(token.encode(), expected.encode())
    ):
        raise HTTPException(status_code=401, detail="Wrong or missing dashboard password")


router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)]
)


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
    in_db = {
        rid
        for (rid,) in db.query(models.Recording.id).filter(
            models.Recording.audio_data.isnot(None)
        )
    }
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
                    "audio_available": r.id in in_db or audio is not None,
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
    if recording is None:
        raise HTTPException(status_code=404, detail="Audio not found")
    media_type = recording.mime_type or "audio/webm"
    if recording.audio_data is not None:
        return Response(content=recording.audio_data, media_type=media_type)
    audio = _audio_path(recording)
    if audio is None:
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio, media_type=media_type)


# --- Raw data export -------------------------------------------------------

EXPORT_COLUMNS = [
    "study_code",
    "session_id",
    "session_started_at",
    "session_completed_at",
    "consent_version",
    "age_band",
    "sex",
    "education_years",
    "primary_language",
    "hearing_status",
    "user_agent",
    "recording_id",
    "test_type",
    "test_config",
    "recording_started_at",
    "recording_completed_at",
    "duration_sec",
    "file_size_bytes",
    "mime_type",
    "mic_device_label",
    "audio_file",
    "transcript",
]


def _iso(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def _export_audio_name(session: models.Session, recording: models.Recording) -> str:
    return f"audio/{session.participant.study_code}/{session.id}/{recording.test_type}_{recording.id}.webm"


def _export_rows(db: DBSession) -> list[tuple[dict, models.Recording | None, models.Session]]:
    """One row per recording; sessions without recordings get one blank-recording row."""
    sessions = (
        db.query(models.Session)
        .options(
            joinedload(models.Session.participant),
            joinedload(models.Session.recordings),
        )
        .order_by(models.Session.started_at)
        .all()
    )
    rows = []
    for s in sessions:
        base = {
            "study_code": s.participant.study_code,
            "session_id": s.id,
            "session_started_at": _iso(s.started_at),
            "session_completed_at": _iso(s.completed_at),
            "consent_version": s.consent_version,
            "age_band": s.age_band or "",
            "sex": s.sex or "",
            "education_years": "" if s.education_years is None else s.education_years,
            "primary_language": s.primary_language or "",
            "hearing_status": s.hearing_status or "",
            "user_agent": s.user_agent or "",
        }
        recordings = sorted(s.recordings, key=lambda r: r.started_at)
        if not recordings:
            rows.append((base, None, s))
        for r in recordings:
            rows.append(
                (
                    {
                        **base,
                        "recording_id": r.id,
                        "test_type": r.test_type,
                        "test_config": json.dumps(r.test_config or {}),
                        "recording_started_at": _iso(r.started_at),
                        "recording_completed_at": _iso(r.completed_at),
                        "duration_sec": r.duration_sec,
                        "file_size_bytes": r.file_size_bytes or "",
                        "mime_type": r.mime_type or "",
                        "mic_device_label": r.mic_device_label or "",
                        "audio_file": _export_audio_name(s, r),
                        "transcript": _transcript(_audio_path(r)) or "",
                    },
                    r,
                    s,
                )
            )
    return rows


def _csv_text(columns: list[str], rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()


def _study_codes_csv(db: DBSession) -> str:
    participants = (
        db.query(models.Participant)
        .options(joinedload(models.Participant.sessions))
        .order_by(models.Participant.created_at)
        .all()
    )
    return _csv_text(
        ["study_code", "created_at", "is_active", "session_count"],
        [
            {
                "study_code": p.study_code,
                "created_at": _iso(p.created_at),
                "is_active": p.is_active,
                "session_count": len(p.sessions),
            }
            for p in participants
        ],
    )


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")


@router.get("/export.csv")
def export_csv(db: DBSession = Depends(get_db)):
    """Every session and recording as one spreadsheet (no audio)."""
    body = _csv_text(EXPORT_COLUMNS, [row for row, _, _ in _export_rows(db)])
    return Response(
        content=body.encode("utf-8-sig"),  # BOM so Excel reads UTF-8 correctly
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="cognicheck-data-{_stamp()}.csv"'},
    )


@router.get("/export.zip")
def export_zip(db: DBSession = Depends(get_db)):
    """Spreadsheets plus every audio file. Built in a temp file to keep RAM low."""
    rows = _export_rows(db)
    tmp = tempfile.SpooledTemporaryFile(max_size=20 * 1024 * 1024)
    with zipfile.ZipFile(tmp, "w") as zf:
        zf.writestr(
            "data.csv",
            _csv_text(EXPORT_COLUMNS, [row for row, _, _ in rows]).encode("utf-8-sig"),
            compress_type=zipfile.ZIP_DEFLATED,
        )
        zf.writestr(
            "study_codes.csv",
            _study_codes_csv(db).encode("utf-8-sig"),
            compress_type=zipfile.ZIP_DEFLATED,
        )
        for row, recording, _ in rows:
            if recording is None:
                continue
            # Load one recording's audio at a time rather than all at once.
            data = (
                db.query(models.Recording.audio_data)
                .filter(models.Recording.id == recording.id)
                .scalar()
            )
            if data is None:
                path = _audio_path(recording)
                data = path.read_bytes() if path else None
            if data is not None:
                # Audio is already compressed; storing avoids wasted CPU.
                zf.writestr(row["audio_file"], data, compress_type=zipfile.ZIP_STORED)
    size = tmp.tell()
    tmp.seek(0)

    def chunks():
        try:
            while block := tmp.read(1024 * 1024):
                yield block
        finally:
            tmp.close()

    return StreamingResponse(
        chunks(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="cognicheck-export-{_stamp()}.zip"',
            "Content-Length": str(size),
        },
    )
