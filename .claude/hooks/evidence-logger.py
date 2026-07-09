#!/usr/bin/env python3
"""
Claude Code evidence logging hook.

Purpose:
- Append lightweight JSONL entries to evidence/claude-code-operations.jsonl.
- Avoid logging secrets or full prompts.
- Demonstrate Custom Hook usage for the assignment.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Any


def summarize_tool_input(tool_input: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for key in ("file_path", "path", "notebook_path"):
        if key in tool_input:
            summary[key] = tool_input[key]
    if "command" in tool_input:
        command = str(tool_input["command"])
        summary["command_preview"] = command[:160]
    if "prompt" in tool_input:
        prompt = str(tool_input["prompt"])
        summary["prompt_preview"] = prompt[:160]
        summary["prompt_length"] = len(prompt)
    return summary


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {"parse_error": True}

    project_dir = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")).resolve()
    evidence_dir = project_dir / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    event = {
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "hook_event_name": payload.get("hook_event_name"),
        "tool_name": payload.get("tool_name"),
        "agent_type": payload.get("agent_type"),
        "source": "claude-code-hook",
        "summary": summarize_tool_input(payload.get("tool_input", {}) or {}),
    }

    log_path = evidence_dir / "claude-code-operations.jsonl"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
