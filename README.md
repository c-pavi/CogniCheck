# CogniCheck Screening Tool

A web-based, self-serve speech screening tool that collects audio recordings from two standardized cognitive tests: the Cookie Theft picture description and a 15-word list recall. Participants access it via a public URL, identify themselves with a study code, and complete both tests. Recordings and metadata are uploaded to a backend for offline analysis.

**This is a research prototype. It is a data collection funnel — no machine learning runs in the deployed tool.**

## Project layout

```
cognicheck/
├── backend/          FastAPI + SQLAlchemy + Postgres
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── config.py         # env-driven settings
│   │   ├── database.py       # SQLAlchemy engine / session
│   │   ├── models.py         # participants / sessions / recordings
│   │   ├── schemas.py        # Pydantic request/response models
│   │   └── routes/
│   │       ├── participants.py
│   │       ├── sessions.py
│   │       └── recordings.py
│   ├── scripts/
│   │   ├── generate_codes.py    # bulk-generate study codes
│   │   └── list_recordings.py   # inspect what's been uploaded, by study code
│   └── requirements.txt
│
├── frontend/         React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── App.tsx           # state-machine router
│       ├── api.ts            # backend API client
│       ├── config.ts         # word list, consent version, stimuli
│       ├── hooks/
│       │   └── useAudioRecorder.ts
│       ├── components/       # Layout, Button, RecordingPanel
│       └── screens/          # Landing, StudyCode, Consent, Demographics,
│                             # TestMenu, CookieTheft, WordRecall, ThankYou
│
└── README.md
```

## Local development (macOS)

### 1. Install prerequisites

Homebrew is the shortest path on Mac:

```bash
brew install python@3.12 node postgresql@16
brew services start postgresql@16
createdb cognicheck
```

Homebrew Postgres creates a database user matching your macOS username with no password (rather than the default `postgres` user), so you'll adjust the connection string in step 2.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set DATABASE_URL to use your macOS username:
#   DATABASE_URL=postgresql://$(whoami)@localhost:5432/cognicheck
# (Run `whoami` in a terminal to see your username, then paste it in.)

uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`. Tables auto-create on first startup.

### 3. Generate study codes

In a second terminal:

```bash
cd backend
source .venv/bin/activate
python scripts/generate_codes.py --count 10
```

Copy one of the printed codes.

### 4. Frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, enter the study code, complete the flow.

**macOS microphone permission:** the first time you press the record button, your browser will prompt for microphone access — click Allow. If the app can't get the mic even after granting the browser prompt, open **System Settings → Privacy & Security → Microphone** and make sure your browser is toggled on there too. macOS gates mic access at both the OS level and the browser level.

### Alternative: Postgres in Docker

If you'd rather use Docker than Homebrew Postgres:

```bash
docker run -d --name cognicheck-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cognicheck \
  -p 5432:5432 postgres:16
```

With Docker, keep the default `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cognicheck` in `.env`.

### On Linux or Windows

The Docker approach above works identically. On Windows, activate the venv with `.venv\Scripts\activate` instead of `source .venv/bin/activate`. Everything else is the same.

## Deployment

### Frontend on Vercel

1. Push the repo to GitHub.
2. In Vercel, import the project and set the root directory to `frontend/`.
3. Set the environment variable `VITE_API_URL` to your deployed backend URL (e.g. `https://cognicheck-backend.onrender.com`).
4. Build command: `npm run build`. Output directory: `dist`.

### Backend on Render

1. Create a **Postgres** service on Render. Note the internal database URL.
2. Create a **Web Service** pointing at this repo, root directory `backend/`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Environment variables:
   - `DATABASE_URL` — from step 1
   - `AUDIO_STORAGE_PATH` — e.g. `/opt/render/project/src/audio_storage`
   - `CORS_ORIGINS` — your Vercel URL, e.g. `https://cognicheck.vercel.app`
   - `CONSENT_VERSION` — `demo-v1`

**Ephemeral disk warning:** Render's free-tier disk is wiped on every redeploy. Fine for demo mode. Before real pilot data collection, either add a paid persistent disk (~$1/mo for 1GB) or move audio to R2/S3 and keep only paths in the database.

## Inspecting collected recordings

Postgres is the source of truth for which recording belongs to which test and study code. On-disk file paths are also self-documenting:

```
audio_storage/
└── COGNI-Q3ZX/                              (study code)
    └── <session-uuid>/
        ├── cookie_theft_<recording-uuid>.webm
        └── word_recall_<recording-uuid>.webm
```

To see everything the database knows, with sessions and durations:

```bash
cd backend
source .venv/bin/activate
python scripts/list_recordings.py                    # all study codes
python scripts/list_recordings.py --code COGNI-Q3ZX  # one study code
```

Sample output:

```
COGNI-Q3ZX
  Session efc3d484-2060-4051-b806-018f1464c604
    Started: 2026-08-21 14:22  (completed)
    - cookie_theft   2m 14s   COGNI-Q3ZX/efc3d484-.../cookie_theft_93a74c2e-....webm
    - word_recall    1m 42s   COGNI-Q3ZX/efc3d484-.../word_recall_3fd355cf-....webm
```

## API endpoints

All under `/api`.

| Method | Path                                | Purpose                             |
|--------|-------------------------------------|-------------------------------------|
| GET    | `/api/health`                       | Health check + consent version      |
| POST   | `/api/participants/check`           | Validate a study code               |
| POST   | `/api/sessions/`                    | Create a session with demographics  |
| POST   | `/api/sessions/{session_id}/complete` | Mark a session complete           |
| POST   | `/api/recordings/`                  | Upload audio + metadata (multipart) |

## What's placeholder and needs replacing before pilot

- **Word list** (`frontend/src/config.ts`, `WORD_LIST`): 15 unrelated concrete nouns. Replace with RAVLT, CERAD, or a professor-approved custom list. Ideally have 2–3 variants and track which was used via `test_config.word_list_id`.
- **Cookie Theft image** (`frontend/public/cookie_theft.jpg`): a stand-in placeholder is committed so the demo runs. The real BDAE original is copyrighted — swap in your institution's licensed materials or a released alternative before pilot.
- **Consent language** (`frontend/src/screens/Consent.tsx`): demo disclaimer only. Replace with REB-approved language before real participants.

## Explicitly not built (yet)

- Machine learning, speech-to-text, or feature extraction (separate repo / notebook)
- Participant-facing results or scores
- Admin dashboard (script + direct SQL is sufficient for v1)
- Longitudinal-session UI (schema supports it, no UI yet)
- Delayed recall (RAVLT trial 7)
- Multi-language support
- Full Alembic migration setup — currently using `Base.metadata.create_all()` on startup for demo simplicity. Add Alembic before schema changes reach any environment with real data.

## License

Research prototype. Not for clinical use.
