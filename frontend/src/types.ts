// Screen router state — the App component keeps this in state and renders
// the corresponding screen. Kept as strings (not an enum) to make it easy to
// serialize into the URL later if we ever want that.
export type Screen =
  | 'landing'
  | 'code'
  | 'consent'
  | 'demographics'
  | 'menu'
  | 'cookie'
  | 'recall'
  | 'thankyou';

export type TestType = 'cookie_theft' | 'word_recall';

export type AgeBand =
  | 'under_55'
  | '55_64'
  | '65_74'
  | '75_84'
  | '85_plus'
  | 'prefer_not_say';

export type Sex = 'female' | 'male' | 'other' | 'prefer_not_say';

export type HearingStatus =
  | 'ok'
  | 'mild_difficulty'
  | 'significant_difficulty'
  | 'prefer_not_say';

export interface Demographics {
  age_band: AgeBand;
  sex: Sex;
  education_years: number | null;
  primary_language: string;
  // hearing_status is currently not collected in the UI but the type + DB
  // column are kept nullable so it can be re-enabled without a migration.
  hearing_status?: HearingStatus;
}

export interface RecordingMetadata {
  test_type: TestType;
  started_at: string;
  completed_at: string;
  duration_sec: number;
  mime_type?: string;
  sample_rate_hz?: number;
  mic_device_label?: string;
  test_config?: Record<string, unknown>;
}

export interface SessionInfo {
  session_id: string;
  study_code: string;
}
