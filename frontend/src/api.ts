import type { Demographics, RecordingMetadata, TestType } from './types';

// In dev, VITE_API_URL is empty and Vite proxies /api to the backend.
// In production, set VITE_API_URL to the deployed backend base
// (e.g. https://cognicheck-backend.onrender.com) — we append /api ourselves.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api';

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ''}`);
  }
  return res.json() as Promise<T>;
}

export interface StudyCodeCheckResponse {
  valid: boolean;
  participant_id?: string;
}

export interface SessionCreateResponse {
  session_id: string;
}

export interface RecordingUploadResponse {
  recording_id: string;
  upload_status: string;
}

export interface AdminOverview {
  study_codes: number;
  active_codes: number;
  sessions: number;
  completed_sessions: number;
  recordings: number;
  recordings_by_test: Partial<Record<TestType, number>>;
  audio_seconds: number;
  age_band: Record<string, number>;
  sex: Record<string, number>;
  primary_language: Record<string, number>;
}

export interface AdminRecording {
  id: string;
  test_type: TestType;
  test_config: Record<string, unknown>;
  started_at: string;
  duration_sec: number;
  file_size_bytes: number | null;
  mic_device_label: string | null;
  audio_available: boolean;
  transcript: string | null;
}

export interface AdminSession {
  id: string;
  study_code: string;
  started_at: string;
  completed_at: string | null;
  consent_version: string;
  age_band: string | null;
  sex: string | null;
  education_years: number | null;
  primary_language: string | null;
  recordings: AdminRecording[];
}

/** Thrown by admin calls when the dashboard password is wrong or missing. */
export class AdminAuthError extends Error {}

async function adminFetch(path: string, token: string): Promise<Response> {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new AdminAuthError('Wrong password');
  return res;
}

export const api = {
  async checkCode(studyCode: string): Promise<StudyCodeCheckResponse> {
    const res = await fetch(`${API_BASE}/participants/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ study_code: studyCode }),
    });
    return parseJson<StudyCodeCheckResponse>(res);
  },

  async createSession(payload: {
    study_code: string;
    consent_version: string;
    user_agent?: string;
    demographics: Demographics;
  }): Promise<SessionCreateResponse> {
    const res = await fetch(`${API_BASE}/sessions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseJson<SessionCreateResponse>(res);
  },

  async uploadRecording(
    sessionId: string,
    metadata: RecordingMetadata,
    audioBlob: Blob,
  ): Promise<RecordingUploadResponse> {
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('metadata', JSON.stringify(metadata));
    form.append('audio', audioBlob, 'recording.webm');
    const res = await fetch(`${API_BASE}/recordings/`, {
      method: 'POST',
      body: form,
    });
    return parseJson<RecordingUploadResponse>(res);
  },

  async completeSession(sessionId: string): Promise<{ completed: boolean }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    return parseJson<{ completed: boolean }>(res);
  },

  async adminOverview(token: string): Promise<AdminOverview> {
    return parseJson<AdminOverview>(await adminFetch('/overview', token));
  },

  async adminSessions(token: string): Promise<AdminSession[]> {
    return parseJson<AdminSession[]>(await adminFetch('/sessions', token));
  },

  /** Audio needs the auth header, so fetch it as a blob for an object URL. */
  async adminAudio(recordingId: string, token: string): Promise<Blob> {
    const res = await adminFetch(`/recordings/${recordingId}/audio`, token);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.blob();
  },
};
