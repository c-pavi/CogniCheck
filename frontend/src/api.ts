import type { Demographics, RecordingMetadata } from './types';

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
};
