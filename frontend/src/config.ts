// Application config that a researcher might want to tweak without touching
// component code. Kept as plain constants for clarity; if we ever move to
// remote config, this is the file to fetch.

// Placeholder 15-word list. Replace with a validated list (RAVLT, CERAD, or a
// professor-approved custom set) before real pilot use. Track which list was
// used in the recording metadata (test_config.word_list_id) so multi-variant
// designs stay analyzable.
export const WORD_LIST_ID = 'placeholder-v1';
export const WORD_LIST: readonly string[] = [
  'drum', 'curtain', 'bell', 'coffee', 'school',
  'parent', 'moon', 'garden', 'hat', 'farmer',
  'nose', 'turkey', 'color', 'house', 'river',
] as const;

// How long each word is shown during the learning phase, in milliseconds.
export const WORD_DISPLAY_MS = 2500;

// Suggested (not enforced) recording durations, in seconds.
export const COOKIE_SUGGESTED_SEC = 120;
export const RECALL_SUGGESTED_SEC = 90;

// Cookie Theft stimulus. Drop the licensed image at frontend/public/cookie_theft.jpg
// and this path will resolve. The CookieTheft screen falls back to a
// placeholder if the image fails to load.
export const COOKIE_IMAGE_PATH = '/cookie_theft.jpg';
export const COOKIE_IMAGE_ID = 'placeholder-v1';

// Consent version string. Must match the CONSENT_VERSION env var on the
// backend, or session creation will fail validation on the server side.
// Bump this string whenever the consent copy changes.
export const CONSENT_VERSION = 'demo-v1';
