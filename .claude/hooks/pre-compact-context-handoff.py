#!/usr/bin/env python3
"""
HOOK: pre-compact-context-handoff
Event:   PreCompact — runs automatically BEFORE Claude Code compacts the context
Purpose: Generate a context handoff document so conversation state survives compaction.

Stdin:   JSON with fields:
           session_id, transcript_path, cwd, permission_mode, hook_event_name,
           trigger (optional: "auto"|"manual"),
           context_remaining_percent (optional: float 0-100)
Stdout:  JSON: { continue: true, suppressOutput: false, systemMessage: "..." }

Context threshold logic:
  - If context_remaining_percent is present and between 10-15 → generate handoff
  - If context_remaining_percent is present but outside 10-15 → skip (unusual for PreCompact)
  - If context_remaining_percent is absent → always generate (PreCompact is sufficient signal)

Exit 0 always — NEVER blocks compaction under any circumstance.

Adapted from: generate-handoff.py (PAUL robot project template)
Project:      3D Print Materials Environment Data Monitoring Dashboard
"""

import json
import logging
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ── Constants ──────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
HANDOFFS_DIR = PROJECT_ROOT / '.claude' / 'context-handoffs'
LOG_FILE     = HANDOFFS_DIR / 'context-handoff.log'
INDEX_FILE   = HANDOFFS_DIR / 'INDEX.md'
MODEL        = 'claude-sonnet-4-6'
MAX_TOKENS   = 4096
MAX_LINES_API = 400
MAX_LINES_FB  = 200
API_TIMEOUT   = 45

# Generate handoff only when context_remaining_percent falls in this window.
# If the field is absent from the payload, always generate.
CTX_LOW  = 10.0
CTX_HIGH = 15.0

# Safety constraints — always listed in section 11 regardless of transcript content
PROTECTED_PATHS = [
    'docs/Requirements.md (source of truth — do not overwrite)',
    'docs/Tasks.md (task checklist — do not overwrite)',
    'SENSOR_MODE default must remain mock unless explicitly testing real hardware',
    'Dracal sensor serial number is E27297 — do not hardcode a different serial',
]

# .env files to search for ANTHROPIC_API_KEY
ENV_CANDIDATES = [
    PROJECT_ROOT / 'backend' / '.env',
    PROJECT_ROOT / '.env',
]

# ── Logging ────────────────────────────────────────────────────────────────────

def setup_logging():
    HANDOFFS_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=str(LOG_FILE),
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    setup_logging()
    logging.info('pre-compact-context-handoff: hook triggered')

    payload = {}
    try:
        raw = read_stdin()
        payload = json.loads(raw)
    except Exception as e:
        logging.warning(f'Failed to parse stdin JSON: {e}')

    session_id      = payload.get('session_id', 'unknown')
    transcript_path = payload.get('transcript_path', '')
    trigger         = _detect_trigger(payload)
    ctx_remaining   = payload.get('context_remaining_percent', None)

    logging.info(f'session={session_id} trigger={trigger} ctx_remaining={ctx_remaining}')

    # ── Context threshold check ────────────────────────────────────────────────
    if ctx_remaining is not None:
        if not (CTX_LOW <= float(ctx_remaining) <= CTX_HIGH):
            msg = (
                f'[Context Handoff] Porcentaje restante ({ctx_remaining:.1f}%) '
                f'fuera del rango {CTX_LOW}-{CTX_HIGH}%. Handoff omitido.'
            )
            logging.info(msg)
            emit_response(True, msg)
            return

    HANDOFFS_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    ts  = now.strftime('%Y-%m-%d_%H-%M-%S')
    date_str = now.strftime('%Y-%m-%d')
    sid_short = re.sub(r'[^a-z0-9]', '', session_id.lower())[:6] or 'nosid'

    content      = ''
    method       = 'fallback'
    task_summary = ''

    try:
        transcript = read_transcript(transcript_path, MAX_LINES_API)
        api_key    = resolve_api_key()

        if api_key:
            try:
                raw_response = generate_with_api(
                    transcript, api_key, session_id, date_str, trigger
                )
                task_summary = extract_task_summary(raw_response) or _fallback_summary(transcript)
                content      = remove_task_summary_comment(raw_response)
                method       = 'api'
                logging.info(f'Handoff generated via API. Summary: {task_summary!r}')
            except Exception as api_err:
                logging.warning(f'API generation failed: {api_err}. Falling back.')
                result       = generate_fallback(transcript, session_id, date_str, trigger)
                content      = result['content']
                task_summary = result['summary']
        else:
            logging.info('No API key available — using fallback generator.')
            result       = generate_fallback(transcript, session_id, date_str, trigger)
            content      = result['content']
            task_summary = result['summary']

    except Exception as err:
        logging.error(f'Handoff generation failed: {err}')
        content      = minimal_handoff(session_id, date_str, trigger, str(err))
        task_summary = 'error-recovery'
        method       = 'error'

    filename = build_filename(ts, sid_short, trigger, task_summary)
    filepath = HANDOFFS_DIR / filename

    try:
        filepath.write_text(content, encoding='utf-8')
        logging.info(f'Handoff written: {filepath}')
    except Exception as write_err:
        logging.error(f'Failed to write handoff file: {write_err}')
        emit_response(True, f'[Context Handoff ERROR] No se pudo escribir el archivo: {write_err}')
        return

    update_index(filename, date_str, now.strftime('%H:%M:%S'), trigger, task_summary, method)

    emit_response(
        True,
        f'[Context Handoff] Documento generado antes de la compactación (método: {method}).\n'
        f'Archivo: .claude/context-handoffs/{filename}\n'
        f'Ruta completa: {filepath}\n'
        f'Para restaurar el contexto, usa la sección "1. Continuation Prompt for Claude" '
        f'del documento como primer mensaje en una nueva sesión.'
    )


# ── Trigger detection ──────────────────────────────────────────────────────────

def _detect_trigger(payload):
    """Detect whether compact was triggered automatically or manually."""
    for key in ('trigger', 'compact_trigger', 'compaction_trigger'):
        val = payload.get(key, '').lower()
        if val in ('auto', 'automatic'):
            return 'auto'
        if val in ('manual', 'user'):
            return 'manual'
    return 'auto'


# ── Filename ───────────────────────────────────────────────────────────────────

def build_filename(ts, sid_short, trigger, task_summary=''):
    """Build filename: context-handoff_{topic}_YYYY-MM-DD_HH-MM-SS_{sid}_{trigger}.md"""
    slug = _topic_slug(task_summary)
    base = f'context-handoff_{slug}_{ts}_{sid_short}_{trigger}'
    name = f'{base}.md'
    counter = 2
    while (HANDOFFS_DIR / name).exists():
        name = f'{base}-{counter}.md'
        counter += 1
    return name


def _topic_slug(task_summary):
    """Sanitize task_summary into a max-30-char kebab-case slug for the filename."""
    if not task_summary:
        return 'sesion'
    slug = re.sub(r'[^a-z0-9-]', '-', task_summary.lower())
    slug = re.sub(r'-{2,}', '-', slug).strip('-')
    if len(slug) > 30:
        trimmed = slug[:30].rsplit('-', 1)[0]
        slug = trimmed if trimmed else slug[:30]
    return slug or 'sesion'


# ── Stdin reader ───────────────────────────────────────────────────────────────

def read_stdin():
    import threading

    if sys.stdin.isatty():
        return '{}'

    result = ['{}']
    done   = threading.Event()

    def _read():
        try:
            data = sys.stdin.read()
            result[0] = data or '{}'
        except Exception:
            pass
        finally:
            done.set()

    t = threading.Thread(target=_read, daemon=True)
    t.start()
    done.wait(timeout=5)
    return result[0]


# ── Transcript reader ──────────────────────────────────────────────────────────

def read_transcript(transcript_path, max_lines):
    if not transcript_path:
        return ''
    try:
        p = Path(transcript_path)
        if not p.exists():
            logging.warning(f'Transcript not found: {transcript_path}')
            return ''
        lines = p.read_text(encoding='utf-8', errors='replace').splitlines()
        return '\n'.join(lines[-max_lines:])
    except Exception as e:
        logging.warning(f'Could not read transcript: {e}')
        return ''


# ── API key resolution ─────────────────────────────────────────────────────────

def resolve_api_key():
    if os.environ.get('ANTHROPIC_API_KEY'):
        return os.environ['ANTHROPIC_API_KEY']

    for env_file in ENV_CANDIDATES:
        try:
            text = env_file.read_text(encoding='utf-8', errors='replace')
            for line in text.splitlines():
                m = re.match(r'^\s*ANTHROPIC_API_KEY\s*=\s*(.+)\s*$', line)
                if m:
                    val = m.group(1).strip().strip('"\'')
                    if val.startswith('sk-ant-'):
                        return val
        except Exception:
            continue

    return None


# ── API generation ─────────────────────────────────────────────────────────────

def generate_with_api(transcript, api_key, session_id, date_str, trigger):
    body = json.dumps({
        'model':      MODEL,
        'max_tokens': MAX_TOKENS,
        'system':     build_system_prompt(),
        'messages':   [{'role': 'user', 'content': build_user_prompt(
            transcript, session_id, date_str, trigger
        )}],
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=body,
        method='POST',
        headers={
            'Content-Type':      'application/json',
            'x-api-key':         api_key,
            'anthropic-version': '2023-06-01',
        },
    )

    with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
        raw = resp.read().decode('utf-8')

    parsed = json.loads(raw)
    if 'error' in parsed:
        raise RuntimeError(parsed['error'].get('message', 'API error'))
    text = parsed.get('content', [{}])[0].get('text', '')
    if not text:
        raise RuntimeError('Empty API response')
    return text


# ── Task summary extraction ────────────────────────────────────────────────────

def extract_task_summary(content):
    """Extract <!-- task-summary: ... --> comment inserted by the API."""
    m = re.search(r'<!--\s*task-summary:\s*([^>]{3,80}?)\s*-->', content, re.IGNORECASE)
    return m.group(1).strip() if m else ''


def remove_task_summary_comment(content):
    return re.sub(r'<!--\s*task-summary:[^\n]*-->\n?', '', content)


def _extract_user_text(lines):
    """Extract user message text from JSONL or plain-text transcript lines."""
    user_msgs = []
    for line in lines:
        line = line.strip()
        if line.startswith('{'):
            try:
                obj = json.loads(line)
                if obj.get('type') != 'user':
                    continue
                msg = obj.get('message', {})
                if not isinstance(msg, dict) or msg.get('role') != 'user':
                    continue
                content = msg.get('content', [])
                if isinstance(content, str):
                    content = [{'type': 'text', 'text': content}]
                texts = []
                for block in content:
                    if isinstance(block, dict) and block.get('type') == 'text':
                        text = block.get('text', '').strip()
                        # Skip wrapped system/tool/IDE content injected by Claude Code
                        if text and not text.startswith('<'):
                            texts.append(text)
                if texts:
                    user_msgs.append(' '.join(texts))
            except (json.JSONDecodeError, AttributeError, TypeError):
                continue
        else:
            m = re.match(r'^(Human|User|usuario)\s*:\s*(.+)', line, re.IGNORECASE)
            if m:
                user_msgs.append(m.group(2).strip())
    return user_msgs


def _extract_tool_uses(lines):
    """Extract tool names and Bash commands from JSONL assistant messages."""
    tool_lines = []
    cmd_lines = []
    for line in lines:
        line = line.strip()
        if line.startswith('{'):
            try:
                obj = json.loads(line)
                if obj.get('type') != 'assistant':
                    continue
                content = obj.get('message', {}).get('content', [])
                if not isinstance(content, list):
                    continue
                for block in content:
                    if not isinstance(block, dict) or block.get('type') != 'tool_use':
                        continue
                    name = block.get('name', '')
                    inp = block.get('input', {})
                    if name == 'Bash':
                        cmd = (inp.get('command') or inp.get('cmd') or '')[:120]
                        if cmd:
                            cmd_lines.append(f'- `{cmd}`')
                    elif name in ('Read', 'Edit', 'Write', 'Glob', 'Grep',
                                  'WebFetch', 'WebSearch', 'TodoWrite', 'Agent'):
                        detail = (inp.get('file_path') or inp.get('pattern')
                                  or inp.get('query') or inp.get('description') or '')[:80]
                        tool_lines.append(f'- `{name}` {detail}'.strip())
            except (json.JSONDecodeError, AttributeError, TypeError):
                continue
        else:
            # Plain text fallback
            if re.search(r'\b(Read|Edit|Write|Bash|Glob|Grep|WebFetch|WebSearch|TodoWrite)\b', line):
                tool_lines.append(f'- `{line.strip()}`')
            if re.match(r'^\$\s|^>>|^python\s|^npm\s|^git\s|^uvicorn\s', line.strip()):
                cmd_lines.append(f'- `{line.strip()}`')
    return tool_lines[-20:], cmd_lines[-10:]


def _fallback_summary(transcript):
    lines = (transcript or '').splitlines()[-MAX_LINES_FB:]
    user_msgs = _extract_user_text(lines)[-1:]
    combined = ' '.join(user_msgs)
    if not combined:
        return 'sesion'
    words = re.sub(r'[^a-z0-9\s]', ' ', combined.lower()).split()[:6]
    return '-'.join(w for w in words if len(w) > 2) or 'sesion'


# ── System / user prompts ──────────────────────────────────────────────────────

def build_system_prompt():
    protected = '\n'.join(f'  - {p}' for p in PROTECTED_PATHS)
    return (
        'Eres un experto en síntesis de conversaciones de desarrollo de software con Claude Code.\n'
        'Tu única tarea es analizar la transcripción de sesión entregada y producir un documento '
        'de traspaso de contexto (context handoff) en inglés.\n\n'
        'El proyecto es 3D Print Materials Environment Data Monitoring Dashboard — aplicación web '
        'local (no cloud) para monitoreo ambiental en vivo de almacenamiento y preparación de '
        'filamentos de impresión 3D, usando un sensor Dracal VCP-PTH450-CAL (serial E27297) con '
        'modo mock activado por defecto.\n\n'
        'Stack: backend FastAPI + SQLAlchemy + SQLite + Python 3.11 (en backend/), '
        'frontend React + Vite + TypeScript + Recharts (en frontend/).\n\n'
        'REGLA DE SEGURIDAD CRÍTICA — restricciones que NUNCA deben violarse:\n'
        f'{protected}\n\n'
        'Documentos de referencia del proyecto: docs/Requirements.md, docs/Tasks.md.\n\n'
        'REGLAS ESTRICTAS DE FORMATO:\n'
        '- La PRIMERA LÍNEA de tu respuesta debe ser EXACTAMENTE:\n'
        '  <!-- task-summary: <3-6 palabras en kebab-case describiendo la tarea activa> -->\n'
        '  (solo letras minúsculas a-z, números y guiones, sin tildes ni eñes)\n'
        '- Tras esa línea, una línea en blanco, luego el documento Markdown completo.\n'
        '- NO escribas nada fuera del comentario task-summary y el documento.\n'
        '- Sigue EXACTAMENTE la estructura de 19 secciones indicada en el user prompt.\n'
        '- NO inventes información ausente del transcript — usa "(not determinable from transcript)".\n'
        '- La sección "1. Continuation Prompt for Claude" debe ser 100% auto-contenida.\n'
        '- La sección "11. Sensor Mode and Safety Constraints" SIEMPRE debe incluir las restricciones '
        'listadas arriba, independientemente del transcript.\n'
    )


def build_user_prompt(transcript, session_id, date_str, trigger):
    protected_list = '\n'.join(f'- `{p}`' for p in PROTECTED_PATHS)
    return (
        f'Analyze this Claude Code session transcript and generate the context handoff document.\n\n'
        f'Session ID: {session_id}\n'
        f'Date: {date_str}\n'
        f'Compact Trigger: {trigger}\n\n'
        f'TRANSCRIPT (recent extract — last {MAX_LINES_API} lines):\n'
        f'---\n'
        f'{transcript or "(transcript not available or empty)"}\n'
        f'---\n\n'
        f'Generate the document with EXACTLY these 19 sections in this order:\n\n'
        f'# Context Handoff — 3D Print Materials Environment Data Monitoring Dashboard\n'
        f'> **Session**: {session_id} | **Date**: {date_str} | **Trigger**: {trigger} | **Method**: API ({MODEL})\n\n'
        f'---\n\n'
        f'## 1. Continuation Prompt for Claude\n\n'
        f'Write a self-contained prompt block (inside triple backticks) that Claude can paste '
        f'into a new session to continue this work immediately. It must include:\n'
        f'- Project: 3D Print Materials Environment Data Monitoring Dashboard (local web app for\n'
        f'  live environmental monitoring of 3D-printing filament storage/readiness)\n'
        f'- Stack context (FastAPI/SQLAlchemy/SQLite backend + React/Vite/TypeScript frontend)\n'
        f'- Exactly what was being worked on (module, file, feature)\n'
        f'- Current state: what is done, what is not\n'
        f'- The instruction: "Continue from the last active task without restarting the project, '
        f'without repeating completed work, and without changing SENSOR_MODE away from mock unless '
        f'explicitly instructed"\n'
        f'- The single most important next action\n'
        f'- Any critical constraints or recent decisions\n\n'
        f'---\n\n'
        f'## 2. Conversation Summary\n\n'
        f'2–4 sentences: what the conversation was about, the main objective, '
        f'which files/modules were worked on, and the overall state at time of compact.\n\n'
        f'---\n\n'
        f'## 3. Current Project / Repository Context\n\n'
        f'- Project path and structure state\n'
        f'- Active git branch (if mentioned)\n'
        f'- Current implementation phase (from Tasks.md if determinable)\n'
        f'- Key environment notes (Python version, Node version, any env files mentioned)\n\n'
        f'---\n\n'
        f'## 4. User Goal\n\n'
        f'The high-level objective the user was trying to achieve in this session. '
        f'Not just the immediate task, but the bigger goal.\n\n'
        f'---\n\n'
        f'## 5. Active Task at Time of Compact\n\n'
        f'Exactly which task was in progress when compaction triggered. '
        f'Be specific: file name, function name, feature name, Tasks.md section if applicable.\n\n'
        f'---\n\n'
        f'## 6. Completed Work\n\n'
        f'Bullet list of everything verified as done and working during this session. '
        f'Include file names where relevant.\n\n'
        f'---\n\n'
        f'## 7. Pending Work\n\n'
        f'Bullet list of tasks identified but not yet completed. '
        f'Include Tasks.md section references if applicable.\n\n'
        f'---\n\n'
        f'## 8. Important Decisions Made\n\n'
        f'Table format: Decision | Alternatives Evaluated | Reason\n'
        f'Include architectural, technical, or workflow decisions that should NOT be revisited.\n\n'
        f'---\n\n'
        f'## 9. Technical Requirements Mentioned\n\n'
        f'Requirements from docs/Requirements.md, docs/Tasks.md, or stated by the user '
        f'that are relevant to continuing this work.\n\n'
        f'---\n\n'
        f'## 10. Files Created or Modified\n\n'
        f'Table format: File Path | Status (Created/Modified/Read/Deleted) | Brief Note\n'
        f'Only include files actually touched or important as context.\n\n'
        f'---\n\n'
        f'## 11. Sensor Mode and Safety Constraints\n\n'
        f'ALWAYS include these regardless of transcript content:\n'
        f'{protected_list}\n\n'
        f'Plus any other constraints or read-only files mentioned during the conversation.\n\n'
        f'---\n\n'
        f'## 12. Commands Already Run\n\n'
        f'List of bash/PowerShell/python commands executed during this session. '
        f'Include brief result or outcome for each.\n\n'
        f'---\n\n'
        f'## 13. Errors, Warnings, or Blockers\n\n'
        f'Any errors encountered, warnings noticed, or blockers identified. '
        f'State whether each was resolved, unresolved, or bypassed.\n\n'
        f'---\n\n'
        f'## 14. Relevant Paths\n\n'
        f'List important file/directory paths with brief descriptions of their purpose. '
        f'Always include: project root, backend path, frontend path, docs path, evidence path.\n\n'
        f'---\n\n'
        f'## 15. Important Formulas, Rules, or Business Logic\n\n'
        f'Include any humidity/temperature/dew-point evaluation rules, material profile '
        f'thresholds, or drying recommendation logic discussed or referenced. If environmental '
        f'evaluation rules were mentioned, list them explicitly (humidity severity thresholds, '
        f'temperature severity thresholds, pressure sanity-only rule, dew-point condensation '
        f'warning/critical gaps, drying temp/time per material family).\n\n'
        f'---\n\n'
        f'## 16. Current Implementation State\n\n'
        f'What exists in the codebase right now vs. what is a stub or not yet implemented. '
        f'Reference the implementation phases from Tasks.md if applicable.\n\n'
        f'---\n\n'
        f'## 17. Next Recommended Steps\n\n'
        f'3–5 specific, actionable steps in priority order. '
        f'Each step must be executable without additional context. '
        f'Include the exact file/command/action for each step.\n\n'
        f'---\n\n'
        f'## 18. Manual Recovery Instructions for User\n\n'
        f'Step-by-step instructions for the user if auto-context-recovery fails:\n'
        f'1. How to find this handoff file\n'
        f'2. How to copy the Continuation Prompt\n'
        f'3. How to paste it in a new Claude Code session\n'
        f'4. What to verify first after pasting\n'
        f'5. Reference to docs/Requirements.md and docs/Tasks.md as source of truth\n\n'
        f'---\n\n'
        f'## 19. Timestamp and Session Metadata\n\n'
        f'- Session ID: {session_id}\n'
        f'- Handoff Generated: {date_str}\n'
        f'- Compact Trigger: {trigger}\n'
        f'- Transcript Provided: {"yes" if transcript else "no"}\n'
        f'- Generation Method: API ({MODEL})\n'
        f'- Hook: pre-compact-context-handoff.py\n'
        f'- Handoff Directory: .claude/context-handoffs/\n'
    )


# ── Fallback generator (no API key) ───────────────────────────────────────────

def generate_fallback(transcript, session_id, date_str, trigger):
    lines = (transcript or '').splitlines()[-MAX_LINES_FB:]

    # Extract referenced file paths (regex works on JSON strings too)
    file_re = re.compile(
        r'(?:^|[\s"\'])((backend|frontend|docs|evidence|\.claude|tmp|scratch)'
        r'[\\/][\w/\\\-. ]+\.\w+)',
        re.IGNORECASE,
    )
    files_set = set()
    for line in lines:
        for m in file_re.finditer(line):
            files_set.add(m.group(1).replace('\\', '/'))

    # Extract last user messages via JSONL-aware helper
    user_msgs = _extract_user_text(lines)[-3:]
    last_user = user_msgs[-1] if user_msgs else '(not detected)'
    msgs_block = '\n'.join(f'- {m}' for m in user_msgs) or '- (not detected)'

    # Extract tool calls and commands via JSONL-aware helper
    tool_lines, cmd_lines = _extract_tool_uses(lines)
    tool_block = '\n'.join(tool_lines) or '- (no tool calls detected)'
    cmd_block = '\n'.join(cmd_lines) or '- (no commands detected)'

    # File table
    if files_set:
        file_rows = '\n'.join(
            f'| `{f}` | referenced | — |' for f in sorted(files_set)
        )
    else:
        file_rows = '| — | — | No file paths detected in transcript excerpt |'

    # Protected paths table
    protected_rows = '\n'.join(
        f'| `{p}` | PROTECTED — never modify |' for p in PROTECTED_PATHS
    )

    summary = _fallback_summary(transcript)

    content = f'''# Context Handoff — 3D Print Materials Environment Data Monitoring Dashboard
> **Session**: {session_id} | **Date**: {date_str} | **Trigger**: {trigger} | **Method**: Fallback (no API key)

---

## 1. Continuation Prompt for Claude

```
Read this handoff document carefully. Use it as the source of truth for the previous
conversation context. Continue from the last active task without restarting the project,
without repeating completed work, and without changing SENSOR_MODE away from mock unless
explicitly instructed.

Project: 3D Print Materials Environment Data Monitoring Dashboard
Path: C:\\Users\\AllamRodriguez\\Desktop\\Programas\\3D Print Materials Environment Data Monitoring Dashboard
Stack: Python 3.11 / FastAPI / SQLAlchemy / SQLite backend (backend/) +
       React / Vite / TypeScript frontend (frontend/)
Docs:  docs/Requirements.md (source of truth) | docs/Tasks.md (task list)

Last detected activity: {last_user}

IMPORTANT: This handoff was generated in FALLBACK mode (ANTHROPIC_API_KEY not
available at hook execution time). Fidelity is limited. Check the recent messages
below and the files table for context clues.

After reading this document, state what you understand to be the active task and
confirm the next step before executing any code changes.
```

---

## 2. Conversation Summary

Session compacted automatically (fallback mode — Anthropic API not available at hook time).
Last detected user activity: "{last_user}".
For full context review the transcript at the path provided in the hook payload stdin.

---

## 3. Current Project / Repository Context

- **Project**: 3D Print Materials Environment Data Monitoring Dashboard
- **Root**: `C:\\Users\\AllamRodriguez\\Desktop\\Programas\\3D Print Materials Environment Data Monitoring Dashboard`
- **Branch**: main (verify with `git branch`)
- **Backend**: `backend/` — FastAPI + SQLAlchemy + SQLite + Python 3.11
- **Frontend**: `frontend/` — React + Vite + TypeScript
- **Sensor**: Dracal VCP-PTH450-CAL, serial E27297; `SENSOR_MODE` defaults to `mock`
- **Docs**: `docs/Requirements.md`, `docs/Tasks.md`

---

## 4. User Goal

(Not determinable in fallback mode — review transcript and last user messages below)

Last detected user messages:
{msgs_block}

---

## 5. Active Task at Time of Compact

(Not determinable in fallback mode)

Review the last tool calls detected:
{tool_block}

---

## 6. Completed Work

- (Requires manual transcript review — fallback mode active)
- Reference `docs/Tasks.md` for phases already checked off in prior sessions

---

## 7. Pending Work

- (Requires manual transcript review — fallback mode active)
- Reference `docs/Tasks.md` for the full pending task list

---

## 8. Important Decisions Made

| Decision | Alternatives | Reason |
|----------|-------------|--------|
| SQLAlchemy + SQLite as persistence | DuckDB, Alembic migrations | Simplicity for a local-first MVP with no pre-existing data |
| Mock sensor mode as default | Requiring real Dracal hardware | Requirements.md mandates mock mode must always work |
| Fallback mode active | API generation | ANTHROPIC_API_KEY not configured at hook time |

---

## 9. Technical Requirements Mentioned

- See `docs/Requirements.md` for complete requirements
- See `docs/Tasks.md` for implementation task list
- Key rule: `SENSOR_MODE` defaults to `mock`; hardware access stays behind the sensor abstraction
- Only `POST /readings` persists Alert rows — `GET /readings/current` returns transient alerts
- Material thresholds must remain editable, not hard-coded as permanent truth

---

## 10. Files Created or Modified

| File Path | Status | Note |
|-----------|--------|------|
{file_rows}

---

## 11. Sensor Mode and Safety Constraints

| Constraint | Rule |
|------|------|
{protected_rows}

---

## 12. Commands Already Run

{cmd_block}

---

## 13. Errors, Warnings, or Blockers

- **Fallback mode**: ANTHROPIC_API_KEY was not available when the hook executed.
  Configure `ANTHROPIC_API_KEY` in `backend/.env` or as a system environment variable
  for full-fidelity handoffs.

---

## 14. Relevant Paths

| Path | Purpose |
|------|---------|
| `C:\\Users\\AllamRodriguez\\Desktop\\Programas\\3D Print Materials Environment Data Monitoring Dashboard` | Project root |
| `backend/` | FastAPI + SQLAlchemy + SQLite Python backend |
| `frontend/` | React/Vite/TypeScript frontend |
| `docs/Requirements.md` | Full project requirements — source of truth |
| `docs/Tasks.md` | Implementation task list |
| `evidence/` | Claude Code evidence artifacts (TDD logs, security review, etc.) |
| `.claude/context-handoffs/` | Context handoff documents |

---

## 15. Important Formulas, Rules, or Business Logic

Key environmental evaluation rules (from docs/Requirements.md §8-9):

- **Humidity severity**: `ok` if `RH <= ideal_rh_max_percent`; `warning` if
  `ideal_rh_max_percent < RH <= warning_rh_max_percent`; `critical` if
  `RH > warning_rh_max_percent` or `RH >= critical_rh_max_percent`
- **Temperature severity**: `ok` within material ideal range, `warning` outside
  ideal but within warning range, `critical` outside critical range
- **Pressure**: traceability/sensor-health only — never gates readiness by itself
- **Dew point**: `warning` if `temperature_c - dew_point_c <= 3°C`,
  `critical` if `temperature_c - dew_point_c <= 1°C`
- **Drying recommendation**: material drying temp/time checked against the
  assigned dryer Location's max temperature; the app never claims to control
  the dryer directly

---

## 16. Current Implementation State

Refer to `docs/Tasks.md` to identify the next pending phase; verify current
state of `backend/` and `frontend/` via `git status` and directory listing.

---

## 17. Next Recommended Steps

1. Run `git status` to confirm current working tree state
2. Open `docs/Tasks.md` and find the first unchecked item
3. Check if backend/ has been initialized (look for `backend/app/main.py`)
4. Configure `ANTHROPIC_API_KEY` in `backend/.env` to enable full-fidelity handoffs
5. Continue with the next unchecked Tasks.md phase

---

## 18. Manual Recovery Instructions for User

1. This handoff file is located at: `.claude/context-handoffs/`
2. Open the file and copy the text block inside section "1. Continuation Prompt for Claude"
3. Start a new Claude Code session in this project directory
4. Paste the copied prompt as the first message
5. Claude will read Requirements.md and Tasks.md to restore context
6. Verify Claude states the correct active task before allowing it to make changes
7. If context is still unclear, ask Claude to re-read `docs/Requirements.md` in full

---

## 19. Timestamp and Session Metadata

- **Session ID**: {session_id}
- **Handoff Generated**: {date_str}
- **Compact Trigger**: {trigger}
- **Transcript Provided**: {'yes' if transcript else 'no'}
- **Generation Method**: Fallback (ANTHROPIC_API_KEY not available)
- **Hook**: pre-compact-context-handoff.py
- **Handoff Directory**: .claude/context-handoffs/
- **API Key Status**: Not configured — configure in backend/.env or system environment
'''

    return {'content': content, 'summary': summary}


# ── Minimal handoff (error recovery) ──────────────────────────────────────────

def minimal_handoff(session_id, date_str, trigger, error_msg):
    return (
        f'# Context Handoff — 3D Print Materials Environment Data Monitoring Dashboard ({date_str}) [GENERATION ERROR]\n'
        f'> **Session**: {session_id} | **Trigger**: {trigger} | **Mode**: Error Recovery\n\n'
        f'The context handoff hook encountered an error and could not generate the full document.\n\n'
        f'**Error**: `{error_msg}`\n\n'
        f'**This error did NOT block the compaction.**\n\n'
        f'**Recovery**: Review the transcript manually. '
        f'Source of truth: `docs/Requirements.md` and `docs/Tasks.md`.\n\n'
        f'**Safety constraints** (never violate):\n'
        + '\n'.join(f'- `{p}`' for p in PROTECTED_PATHS)
    )


# ── INDEX.md updater ───────────────────────────────────────────────────────────

def update_index(filename, date_str, time_str, trigger, task_summary, method):
    try:
        header = (
            '# Context Handoff Index — 3D Print Materials Environment Data Monitoring Dashboard\n\n'
            '> Generated automatically by pre-compact-context-handoff.py\n'
            '> Do not edit manually — appended by the PreCompact hook.\n\n'
            '| Date | Time | Trigger | Method | Active Task Summary | File |\n'
            '|------|------|---------|--------|---------------------|------|\n'
        )

        new_row = (
            f'| {date_str} | {time_str} | {trigger} | {method} '
            f'| {task_summary or "—"} '
            f'| [{filename}]({filename}) |\n'
        )

        if INDEX_FILE.exists():
            existing = INDEX_FILE.read_text(encoding='utf-8')
            if '|------|' in existing:
                INDEX_FILE.write_text(existing + new_row, encoding='utf-8')
            else:
                INDEX_FILE.write_text(header + new_row, encoding='utf-8')
        else:
            INDEX_FILE.write_text(header + new_row, encoding='utf-8')

        logging.info(f'INDEX.md updated with entry for {filename}')
    except Exception as e:
        logging.warning(f'Could not update INDEX.md: {e}')


# ── Response emitter ───────────────────────────────────────────────────────────

def emit_response(continue_flag, system_message):
    try:
        sys.stdout.write(json.dumps({
            'continue':       continue_flag,
            'suppressOutput': False,
            'systemMessage':  system_message,
        }))
        sys.stdout.flush()
    except Exception:
        pass


# ── Main guard ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    try:
        main()
    except Exception as err:
        emit_response(True, f'[Context Handoff ERROR] Unexpected hook failure: {err}')
    sys.exit(0)
