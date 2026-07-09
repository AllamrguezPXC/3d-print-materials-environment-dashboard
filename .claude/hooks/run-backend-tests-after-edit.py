#!/usr/bin/env python3
"""
Optional hook template.

This is intentionally not enabled by default because running pytest after every
edit can be slow. Enable it in .claude/settings.json for PostToolUse on backend
files if you want automatic test checks.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input", {}) or {}
    file_path = str(tool_input.get("file_path") or tool_input.get("path") or "")
    if "backend" not in file_path:
        return 0

    project_dir = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
    backend_dir = project_dir / "backend"
    if not backend_dir.exists():
        return 0

    result = subprocess.run(["pytest", "-q"], cwd=backend_dir, text=True, capture_output=True)
    evidence_dir = project_dir / "evidence"
    evidence_dir.mkdir(exist_ok=True)
    (evidence_dir / "latest-backend-pytest.txt").write_text(result.stdout + "\n" + result.stderr, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
