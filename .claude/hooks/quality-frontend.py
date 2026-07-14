#!/usr/bin/env python3
"""HOOK: quality-frontend
Event:   PostToolUse (Write|Edit)
Purpose: Run oxlint (this project's actual frontend linter -- see
         frontend/package.json's "lint" script) when a frontend
         TypeScript/JavaScript file is written.
"""
import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

try:
    payload = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)

tool_name  = payload.get("tool_name", "")
tool_input = payload.get("tool_input", {})

if tool_name not in ("Write", "Edit"):
    sys.exit(0)

file_path = tool_input.get("file_path", "")
if not any(file_path.endswith(ext) for ext in (".ts", ".tsx", ".js", ".jsx")):
    sys.exit(0)

path = Path(file_path)
try:
    path.relative_to(FRONTEND_DIR)
except ValueError:
    sys.exit(0)  # not a frontend file

try:
    result = subprocess.run(
        # Matches frontend/package.json's own "lint" script exactly (plain
        # `oxlint`, no extra strictness) -- this hook surfaces the same
        # signal `npm run lint`/CI already would, not a stricter new bar that
        # would flag this repo's existing, already-tolerated warnings.
        ["npx", "oxlint", str(path)],
        cwd=str(FRONTEND_DIR),
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0 and (result.stdout.strip() or result.stderr.strip()):
        output = (result.stdout + result.stderr).strip()[:400]
        print(json.dumps({
            "suppressOutput": False,
            "systemMessage": f"oxlint: {output}",
        }))
except Exception:
    pass

sys.exit(0)
