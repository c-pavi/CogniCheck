"""Generate N study codes and insert them into the participants table.

Usage (from the backend/ directory):
    python scripts/generate_codes.py --count 20

Codes follow the format COGNI-XXXX where XXXX is 4-char alphanumeric.
"""
import argparse
import random
import string
import sys
from pathlib import Path

# Make the app package importable when running from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.models import Participant  # noqa: E402


ALPHABET = string.ascii_uppercase + string.digits


def make_code(length: int = 4) -> str:
    return "COGNI-" + "".join(random.choices(ALPHABET, k=length))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate CogniCheck study codes.")
    parser.add_argument("--count", type=int, default=10, help="Number of codes to create")
    args = parser.parse_args()

    db = SessionLocal()
    created: list[str] = []
    try:
        attempts = 0
        while len(created) < args.count and attempts < args.count * 10:
            attempts += 1
            code = make_code()
            existing = db.query(Participant).filter(Participant.study_code == code).first()
            if existing:
                continue
            participant = Participant(study_code=code)
            db.add(participant)
            db.commit()
            created.append(code)
    finally:
        db.close()

    print(f"Created {len(created)} study codes:")
    for code in created:
        print(f"  {code}")


if __name__ == "__main__":
    main()
