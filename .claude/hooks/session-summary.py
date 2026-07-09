#!/usr/bin/env python3
"""HOOK: session-summary
Event:   Stop
Purpose: Append a brief session entry to exports/logs/session_summary.md
"""
import json
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT  = Path(__file__).resolve().parent.parent.parent
SUMMARY_FILE  = PROJECT_ROOT / "exports" / "logs" / "session_summary.md"

try:
    payload = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)

session_id   = payload.get("session_id", "unknown")
stop_reason  = payload.get("stop_reason", "unknown")
transcript   = payload.get("transcript_path", "")

sid_short = session_id[:8] if session_id and session_id != "unknown" else "unknown"
ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

entry = (
    f"## Session {sid_short} — {ts}\n\n"
    f"- **Stop reason**: {stop_reason}\n"
    f"- **Transcript**: {transcript}\n\n"
    "---\n"
)

try:
    SUMMARY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SUMMARY_FILE.open("a", encoding="utf-8") as f:
        f.write(entry)
except Exception:
    pass

sys.exit(0)
