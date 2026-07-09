#!/usr/bin/env python3
"""
Claude Code PreToolUse hook.

Purpose:
- Block destructive shell commands before they run.
- Provide clear evidence that the project uses a practical safety hook.

This hook reads Claude Code JSON input from stdin and returns a JSON permission
response when a dangerous command is detected.
"""

from __future__ import annotations

import json
import re
import sys

DANGEROUS_PATTERNS = [
    r"\brm\s+-rf\b",
    r"\brm\s+-fr\b",
    r"\brmdir\s+/s\b",
    r"\bdel\s+/s\b",
    r"Remove-Item\s+.*-Recurse.*-Force",
    r"\bformat\s+[A-Za-z]:",
    r"\bdrop\s+database\b",
    r"\bshutdown\b",
]


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input", {}) or {}
    command = str(tool_input.get("command") or tool_input.get("script") or "")

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command, flags=re.IGNORECASE):
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        "Blocked by project safety hook: command appears destructive. "
                        "Revise the command or ask the user for explicit approval."
                    ),
                }
            }))
            return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
