"""FastAPI application entrypoint for the CogniCheck screening tool backend.

Run locally with:
    uvicorn app.main:app --reload
"""
from pathlib import Path

from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  # ensure models register with Base metadata
from .config import settings
from .database import Base, engine
from .routes import admin, participants, recordings, sessions

# Ensure audio storage directory exists.
Path(settings.audio_storage_path).mkdir(parents=True, exist_ok=True)

# Bootstrap tables for the demo. For production, use Alembic migrations.
Base.metadata.create_all(bind=engine)

# create_all() doesn't add columns to existing tables, so add ones introduced
# after the first deploy by hand. Replace with Alembic before real data.
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE recordings ADD COLUMN IF NOT EXISTS audio_data BYTEA"))

app = FastAPI(title="CogniCheck Screening Tool API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(participants.router)
app.include_router(sessions.router)
app.include_router(recordings.router)

# Researcher dashboard API: only mounted when a password (ADMIN_TOKEN) is set.
if settings.admin_token:
    app.include_router(admin.router)


@app.get("/api/health")
def health():
    """Simple health check that also exposes the current consent version."""
    return {"status": "ok", "consent_version": settings.consent_version}
