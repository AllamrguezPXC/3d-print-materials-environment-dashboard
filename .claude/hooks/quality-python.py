#!/usr/bin/env python3
"""HOOK: quality-python
Event:   PostToolUse (Write|Edit)
Purpose: Run ruff check when a backend Python file is written.
"""
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR  = PROJECT_ROOT / "backend"

try:
    payload = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)

tool_name  = payload.get("tool_name", "")
tool_input = payload.get("tool_input", {})

if tool_name not in ("Write", "Edit"):
    sys.exit(0)

file_path = tool_input.get("file_path", "")
if not file_path.endswith(".py"):
    sys.exit(0)

path = Path(file_path)
try:
    path.relative_to(BACKEND_DIR)
except ValueError:
    sys.exit(0)  # not a backend file

try:
    result = subprocess.run(
        [sys.executable, "-m", "ruff", "check", str(path)],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0 and result.stdout.strip():
        print(json.dumps({
            "suppressOutput": False,
            "systemMessage": f"ruff: {result.stdout.strip()[:400]}",
        }))
except Exception:
    pass

sys.exit(0)
