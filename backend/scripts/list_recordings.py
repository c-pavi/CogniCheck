"""List all uploaded recordings, organized by study code.

Usage (from the backend/ directory, with venv activated):

    python scripts/list_recordings.py                    # all study codes
    python scripts/list_recordings.py --code COGNI-Q3ZX  # one specific code

The output shows, for each study code:
    - each session (with started/completed timestamps)
    - each recording within the session (test type + file path + duration)

The file paths shown are relative to AUDIO_STORAGE_PATH (from .env).
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.models import Participant  # noqa: E402


def format_duration(sec: int) -> str:
    minutes, seconds = divmod(sec, 60)
    return f"{minutes}m {seconds:02d}s"


def main() -> None:
    parser = argparse.ArgumentParser(description="List uploaded recordings by study code.")
    parser.add_argument("--code", help="Filter to a specific study code (case-insensitive)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = db.query(Participant)
        if args.code:
            query = query.filter(Participant.study_code == args.code.strip().upper())
        query = query.order_by(Participant.created_at)

        participants = query.all()
        if not participants:
            if args.code:
                print(f"No participant found for study code {args.code!r}.")
            else:
                print("No participants found.")
            return

        for p in participants:
            print()
            print(p.study_code)
            sessions = sorted(p.sessions, key=lambda s: s.started_at)
            if not sessions:
                print("  (no sessions yet)")
                continue

            for s in sessions:
                started = s.started_at.strftime("%Y-%m-%d %H:%M")
                status = "completed" if s.completed_at else "in progress / abandoned"
                print(f"  Session {s.id}")
                print(f"    Started: {started}  ({status})")

                recordings = sorted(s.recordings, key=lambda r: r.created_at)
                if not recordings:
                    print("    (no recordings uploaded)")
                    continue

                for r in recordings:
                    duration = format_duration(r.duration_sec)
                    print(f"    - {r.test_type:14s}  {duration:>8s}  {r.file_path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
