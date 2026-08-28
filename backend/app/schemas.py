"""Pydantic schemas for API request and response payloads."""
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---- Study code validation ----

class StudyCodeCheck(BaseModel):
    study_code: str


class StudyCodeValid(BaseModel):
    valid: bool
    participant_id: Optional[UUID] = None


# ---- Session creation ----

class DemographicsInput(BaseModel):
    age_band: Literal[
        "under_55", "55_64", "65_74", "75_84", "85_plus", "prefer_not_say"
    ]
    sex: Literal["female", "male", "other", "prefer_not_say"]
    education_years: Optional[int] = Field(None, ge=0, le=30)
    primary_language: str
    # Not currently collected in the UI, but the schema + DB column remain in
    # place so the question can be re-enabled without a migration.
    hearing_status: Optional[
        Literal["ok", "mild_difficulty", "significant_difficulty", "prefer_not_say"]
    ] = None


class SessionCreate(BaseModel):
    study_code: str
    consent_version: str
    user_agent: Optional[str] = None
    demographics: DemographicsInput


class SessionResponse(BaseModel):
    session_id: UUID


class SessionComplete(BaseModel):
    completed: bool


# ---- Recording upload ----

class RecordingResponse(BaseModel):
    recording_id: UUID
    upload_status: str
