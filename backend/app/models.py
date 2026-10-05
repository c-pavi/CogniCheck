"""SQLAlchemy models for the CogniCheck screening tool.

Mirrors the schema we workshopped: participants -> sessions -> recordings.
The two "future" tables (participant_health, clinical_scores) are documented
in the requirements but intentionally not built yet.
"""
import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import deferred, relationship
from sqlalchemy.sql import func

from .database import Base


class Participant(Base):
    __tablename__ = "participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    study_code = Column(Text, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text)

    sessions = relationship(
        "Session", back_populates="participant", cascade="all, delete-orphan"
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    participant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    started_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    completed_at = Column(DateTime(timezone=True))
    abandoned = Column(Boolean, default=False, nullable=False)

    # Consent
    consent_version = Column(Text, nullable=False)
    consent_accepted_at = Column(DateTime(timezone=True), nullable=False)

    # Environment
    user_agent = Column(Text)

    # Demographics (captured this session)
    age_band = Column(Text)
    sex = Column(Text)
    education_years = Column(Integer)
    primary_language = Column(Text)
    hearing_status = Column(Text)

    __table_args__ = (
        CheckConstraint(
            "age_band IN ('under_55','55_64','65_74','75_84','85_plus','prefer_not_say')",
            name="ck_sessions_age_band",
        ),
        CheckConstraint(
            "sex IN ('female','male','other','prefer_not_say')",
            name="ck_sessions_sex",
        ),
        CheckConstraint(
            "education_years IS NULL OR (education_years BETWEEN 0 AND 30)",
            name="ck_sessions_education_years",
        ),
        CheckConstraint(
            "hearing_status IN ('ok','mild_difficulty','significant_difficulty','prefer_not_say')",
            name="ck_sessions_hearing_status",
        ),
    )

    participant = relationship("Participant", back_populates="sessions")
    recordings = relationship(
        "Recording", back_populates="session", cascade="all, delete-orphan"
    )


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    test_type = Column(Text, nullable=False, index=True)
    test_config = Column(JSONB, default=dict, nullable=False)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)
    duration_sec = Column(Integer, nullable=False)

    # Audio file (path is relative to AUDIO_STORAGE_PATH)
    file_path = Column(Text, nullable=False)
    file_size_bytes = Column(BigInteger)
    mime_type = Column(Text)
    sample_rate_hz = Column(Integer)
    mic_device_label = Column(Text)

    # The audio itself, kept in Postgres so it survives hosts with ephemeral
    # disks (e.g. Render free tier). Deferred so listing rows doesn't load it.
    audio_data = deferred(Column(LargeBinary))

    # Upload state
    upload_status = Column(Text, default="pending", nullable=False)
    upload_completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "test_type IN ('cookie_theft','word_recall')",
            name="ck_recordings_test_type",
        ),
        CheckConstraint(
            "upload_status IN ('pending','complete','failed')",
            name="ck_recordings_upload_status",
        ),
    )

    session = relationship("Session", back_populates="recordings")
