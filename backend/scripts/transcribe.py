"""Transcribe uploaded audio recordings using faster-whisper.

Reads recordings from the database, transcribes each with Whisper, and saves
both a plain-text transcript and a structured JSON output alongside the
original audio file:

    audio_storage/COGNI-Q3ZX/<session>/cookie_theft_<id>.webm  (audio)
    audio_storage/COGNI-Q3ZX/<session>/cookie_theft_<id>.txt   (text)
    audio_storage/COGNI-Q3ZX/<session>/cookie_theft_<id>.json  (segments + word timestamps)

The JSON output preserves segment start/end times and per-word timestamps and
confidence, which downstream feature extractors need for pause rate, speech
rate, disfluency detection, etc.

Usage (from backend/ with venv activated):

    python scripts/transcribe.py                     # everything not yet done
    python scripts/transcribe.py --code COGNI-Q3ZX   # one study code
    python scripts/transcribe.py --model medium      # larger model for better quality
    python scripts/transcribe.py --force             # re-transcribe even if .txt exists

Prerequisites:

    pip install faster-whisper

The first run downloads the model (~500MB for 'small'). Subsequent runs are cached.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Participant  # noqa: E402


def transcribe_one(model, audio_path: Path) -> dict:
    """Run Whisper on a single audio file. Returns a dict with text + segments."""
    # word_timestamps=True gives per-word start/end/probability, which we
    # want for downstream feature extraction (pauses, speech rate, etc.).
    # language='en' is a reasonable default for the pilot; when the study
    # supports non-English participants, map from session.primary_language
    # to an ISO code and pass that in instead.
    segments, info = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        language="en",
        vad_filter=True,  # Voice activity detection — skips silent stretches
    )

    segments_out: list[dict] = []
    text_parts: list[str] = []

    for seg in segments:
        words_out = []
        if seg.words:
            for w in seg.words:
                words_out.append(
                    {
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    }
                )
        segments_out.append(
            {
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text,
                "words": words_out,
            }
        )
        text_parts.append(seg.text)

    return {
        "text": "".join(text_parts).strip(),
        "segments": segments_out,
        "language": info.language,
        "language_probability": round(info.language_probability, 4),
        "duration": round(info.duration, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe CogniCheck recordings with Whisper.")
    parser.add_argument("--code", help="Only transcribe recordings for this study code")
    parser.add_argument(
        "--model",
        default="small",
        help="Whisper model size: tiny | base | small | medium | large-v3 (default: small)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-transcribe even if a .txt output already exists",
    )
    args = parser.parse_args()

    # Import here so `--help` works without faster-whisper installed.
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper is not installed. Install it with:")
        print("    pip install faster-whisper")
        sys.exit(1)

    print(f"Loading Whisper model: {args.model}")
    print("(First run downloads the model — this can take a minute.)")
    # device='auto' picks CUDA/Metal if available, otherwise CPU.
    # compute_type='auto' picks the fastest precision the device supports.
    model = WhisperModel(args.model, device="auto", compute_type="auto")
    print("Model loaded.\n")

    audio_root = Path(settings.audio_storage_path).resolve()

    db = SessionLocal()
    stats = {"transcribed": 0, "skipped": 0, "missing": 0, "failed": 0}
    try:
        query = db.query(Participant)
        if args.code:
            query = query.filter(Participant.study_code == args.code.strip().upper())

        participants = query.order_by(Participant.created_at).all()
        if not participants:
            print("No matching participants found.")
            return

        for participant in participants:
            for session in participant.sessions:
                for rec in session.recordings:
                    audio_path = audio_root / rec.file_path
                    txt_path = audio_path.with_suffix(".txt")
                    json_path = audio_path.with_suffix(".json")

                    label = f"{participant.study_code} / {rec.test_type}"

                    if not audio_path.exists():
                        print(f"  ✗ {label}  missing file: {rec.file_path}")
                        stats["missing"] += 1
                        continue

                    if txt_path.exists() and not args.force:
                        print(f"  · {label}  already transcribed, skipping")
                        stats["skipped"] += 1
                        continue

                    print(f"  → {label}  transcribing…", end="", flush=True)
                    start = time.time()
                    try:
                        result = transcribe_one(model, audio_path)
                    except Exception as exc:  # noqa: BLE001
                        print(f"\n    ✗ failed: {exc}")
                        stats["failed"] += 1
                        continue

                    txt_path.write_text(result["text"])
                    json_path.write_text(json.dumps(result, indent=2))
                    elapsed = time.time() - start
                    print(
                        f" done in {elapsed:.1f}s "
                        f"({len(result['text'])} chars, {len(result['segments'])} segments)"
                    )
                    stats["transcribed"] += 1
    finally:
        db.close()

    print()
    print(
        f"Summary: {stats['transcribed']} transcribed, "
        f"{stats['skipped']} skipped, "
        f"{stats['missing']} missing files, "
        f"{stats['failed']} failed"
    )


if __name__ == "__main__":
    main()