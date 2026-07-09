#!/usr/bin/env python3
"""HOOK: audit-posttooluse
Event:   PostToolUse
Purpose: Append one-line audit entry to exports/logs/claude_tool_audit.log
"""
import json
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
LOG_FILE = PROJECT_ROOT / "exports" / "logs" / "claude_tool_audit.log"

try:
    payload = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)

tool_name  = payload.get("tool_name", "unknown")
tool_input = payload.get("tool_input", {})

if tool_name in ("Write", "Edit"):
    target = tool_input.get("file_path", "?")
    summary = f"{tool_name} -> {target}"
elif tool_name == "Bash":
    cmd = tool_input.get("command", "?")[:100].replace("\n", " ")
    summary = f"Bash: {cmd}"
elif tool_name == "Read":
    target = tool_input.get("file_path", "?")
    summary = f"Read <- {target}"
elif tool_name == "PowerShell":
    cmd = tool_input.get("command", "?")[:100].replace("\n", " ")
    summary = f"PowerShell: {cmd}"
else:
    summary = f"{tool_name}"

ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
line = f"[{ts}] {summary}\n"

try:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
except Exception:
    pass

sys.exit(0)
