# Context Handoffs — 3D Print Materials Environment Data Monitoring Dashboard

Context handoff documents are generated automatically before Claude Code compacts the context
window, and can also be triggered manually at any time.

---

## What Does This System Do?

Before a context compaction event, the hook `.claude/hooks/pre-compact-context-handoff.py`
generates a structured Markdown document that captures the complete state of the current
session: active task, completed work, pending work, decisions, files, commands, errors,
environmental evaluation rules, and a ready-to-paste Continuation Prompt.

This allows:
1. **Claude** to read the document after compaction and resume work without losing context.
2. **You** to copy the Continuation Prompt manually into a new session if needed.

---

## When Does It Execute?

The hook fires on the **PreCompact** event — immediately before Claude Code compacts the
context. This is automatic and requires no user action.

**Context threshold logic:**

| `context_remaining_percent` in payload | Behavior |
|----------------------------------------|----------|
| Present AND between 10–15% | Generate handoff |
| Present AND outside 10–15% | Skip (log only) |
| Not present in payload | Always generate (PreCompact is sufficient signal) |

**Manual trigger:** Type `/context-handoff` at any time to generate a checkpoint
proactively (uses the `context-handoff-specialist` agent).

---

## Where Are the Handoffs Saved?

All handoff files are saved in this directory:

```
.claude/context-handoffs/
├── README.md              ← this file
├── INDEX.md               ← table of all generated handoffs
├── context-handoff.log    ← hook execution log
└── context-handoff_{topic}_YYYY-MM-DD_HH-MM-SS_{session}_{trigger}.md
```

**Filename format:**
```
context-handoff_{topic}_YYYY-MM-DD_HH-MM-SS_{session}_{trigger}.md
                │       │           │        │       └── trigger: auto or manual
                │       │           │        └────────── first 6 chars of session ID
                │       │           └─────────────────── time HH-MM-SS
                │       └─────────────────────────────── date YYYY-MM-DD
                └─────────────────────────────────────── kebab-case topic slug (≤30 chars)
```

Examples:
```
context-handoff_readings-current-tdd_2026-07-09_14-30-22_abc123_auto.md
context-handoff_context-handoff-system_2026-07-09_15-45-00_abc123_manual.md
context-handoff_sesion_2026-07-09_16-10-33_abc123_auto.md   ← fallback slug
```

---

## How to Use a Handoff Manually After Compaction

If Claude Code lost context after compaction and the auto-recovery did not work:

1. Open the most recent file listed in `INDEX.md`
2. Find **Section 1: Continuation Prompt for Claude**
3. Copy the entire text block inside the triple backticks
4. Start a new Claude Code session (or use `/clear` to reset)
5. Paste the copied text as your first message
6. Claude will read `docs/Requirements.md` and `docs/Tasks.md` to restore project context
7. Verify Claude states the correct active task before allowing any code changes

---

## How to Test the Hook

Run the hook manually with a simulated JSON payload:

```bash
# Auto-compact simulation (context_remaining_percent = 12.5%)
python .claude/hooks/pre-compact-context-handoff.py < .claude/hooks/test-fixtures/precompact-auto.json

# Manual compact simulation (no context_remaining_percent field)
python .claude/hooks/pre-compact-context-handoff.py < .claude/hooks/test-fixtures/precompact-manual.json
```

Expected behavior:
- A new `.md` file appears in `.claude/context-handoffs/`
- `INDEX.md` gains a new row
- `context-handoff.log` shows the hook ran
- The script exits 0 and prints a JSON response with `continue: true`

---

## Generation Methods

| Method | When | Fidelity |
|--------|------|----------|
| **API** | `ANTHROPIC_API_KEY` is configured | High — Claude analyzes full transcript |
| **Fallback** | No API key available | Medium — heuristic extraction via regex |
| **Error recovery** | Hook failed unexpectedly | Minimal — session ID and date only |

To enable API-based handoffs (recommended):

```env
# Add to backend/.env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## What If context_remaining_percent Is Not Available?

Claude Code may not always provide this field in the PreCompact hook payload.
When the field is absent, the hook **always generates a handoff** — PreCompact
firing is itself sufficient signal that compaction is imminent.

This is the safe default: it's better to generate an unnecessary handoff than
to miss a compaction event.

---

## How to Temporarily Disable the Hook

Remove or comment out the PreCompact entry in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreCompact": []
  }
}
```

Re-enable by restoring the original entry (see `.claude/settings.json`).

---

## Sensor Mode and Safety Constraints Reminder

The following constraints must never be violated by any script, agent, or hook.
They are always listed in section 11 of every handoff document:

```
SENSOR_MODE default: mock (do not change to dracal_vcp without explicit instruction)
Dracal sensor serial number: E27297 (do not hardcode a different serial)
Alert persistence: only POST /readings persists Alert rows; GET /readings/current
  computes and returns transient alerts without writing to the database
Do not overwrite docs/Requirements.md or docs/Tasks.md — they are the source of truth
Never commit .env, local SQLite database files, node_modules, or Python caches
```

Source: `docs/Requirements.md` and root `CLAUDE.md`.

---

## Index File

`INDEX.md` is automatically updated by the hook on every successful handoff generation.
Format: date, time, trigger, method, active task summary, file link.
Do not edit `INDEX.md` manually — let the hook maintain it.
