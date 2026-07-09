---
name: context-handoff
description: >
  Generates a dense, structured context handoff document before auto-compact
  or on manual request. Preserves conversation state, decisions, active tasks,
  and project context for the 3D Print Materials Environment Data Monitoring
  Dashboard project. Trigger: /context-handoff or when a compaction warning
  appears in context.
used_by:
  - context-handoff-specialist
  - backend-fastapi-architect
  - sensor-integration-specialist
  - materials-domain-specialist
  - docs-evidence-curator
---

# Skill: Context Handoff

## CONTRACT

- **Input**: Current conversation state, tool call history, file system state
- **Output**: `context-handoff_<topic-slug>_<timestamp>_<sid-short>_<trigger>.md` in `.claude/context-handoffs/`
- **Trigger**: Manual (`/context-handoff`) or proactive (compaction signal detected)
- **Critical rule**: Document is generated BEFORE compaction — as the FIRST act of the turn
  when a compaction warning is detected, not after the user's request is processed.

---

## WHEN TO INVOKE

### Trigger 1 — Manual

The user types `/context-handoff` or explicitly asks for a context checkpoint.
Use as a preventive measure before long implementation tasks or at end of session.

### Trigger 2 — Proactive (auto-detection)

**This is the primary mechanism.**

Claude Code sends `system-reminder` messages as the context window fills.
Detect any of these signals:

- "auto-compact" / "auto compact"
- "context window is almost full" / "context window"
- "compaction" / "context is being compressed"
- "context limit" / any variant indicating imminent compaction

**Action**: Invoke this skill immediately as the first act of the turn.
Generate the handoff, confirm the path, then respond to the user briefly.

> **Documented limitation**: Claude Code does not expose an exact context
> percentage via API. Auto-detection relies on system-reminder messages.
> Use manual `/context-handoff` proactively in long sessions (every ~60-70% usage).

### Trigger 3 — PreCompact Hook (automatic)

The hook `.claude/hooks/pre-compact-context-handoff.py` runs automatically
via Claude Code's PreCompact event. This is a safety net — it runs even if
the in-context skill is not invoked. The hook uses the Anthropic API when
available, or falls back to heuristic extraction.

---

## FILENAME CONVENTION

```
context-handoff_<topic-slug>_YYYY-MM-DD_HH-MM-SS_<sid-short>_<trigger>.md
```

This format is **identical** to the one produced by the PreCompact hook
(`pre-compact-context-handoff.py` → `build_filename()`). All three sources
(hook, skill, agent) must produce filenames in this exact format.

Components:

| Component | Description | Default |
|-----------|-------------|---------|
| `<topic-slug>` | kebab-case summary of the active task (max 30 chars, `a-z 0-9 -` only) | `sesion` |
| `YYYY-MM-DD_HH-MM-SS` | local timestamp at time of generation | — |
| `<sid-short>` | first 6 alphanumeric chars of the Claude Code session ID | `nosid` |
| `<trigger>` | `auto` (hook-triggered) or `manual` (skill/agent-triggered) | — |

For collision avoidance, append `-2`, `-3`, etc. to the base name before `.md`.

Examples:
```
context-handoff_readings-current-tdd_2026-07-09_11-14-23_c69368_manual.md
context-handoff_mock-sensor-drift_2026-07-09_15-59-52_abc123_manual.md
context-handoff_sesion_2026-07-09_14-30-22_nosid_manual.md          ← no task / no sid
context-handoff_dashboard-alert-panel_2026-07-09_15-59-52_c69368_manual-2.md  ← collision
```

**PowerShell snippet to determine filename (use in skill and agent):**

```powershell
# 1. Derive topic slug from the active task description (max 30 chars, kebab-case)
$taskSummary = "readings-current-endpoint-tdd"   # replace with actual active task
$slug = ($taskSummary.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
if ($slug.Length -gt 30) { $slug = ($slug.Substring(0, 30)).TrimEnd('-') }
if (-not $slug) { $slug = 'sesion' }

# 2. Timestamp
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# 3. Session ID short — use the real 6-char session ID if determinable from context;
#    otherwise use the literal string "nosid" (matches hook's default for unknown sessions)
$sid = "nosid"   # replace with actual session ID short if available

# 4. Assemble and resolve collisions
$base = ".claude\context-handoffs\context-handoff_${slug}_${ts}_${sid}_manual"
$name = "$base.md"
$counter = 2
while (Test-Path $name) { $name = "$base-$counter.md"; $counter++ }
Write-Output $name
```

---

## DOCUMENT STRUCTURE (19 Sections — MANDATORY)

Every handoff document must contain exactly these 19 sections in this order:

```markdown
# Context Handoff — 3D Print Materials Environment Data Monitoring Dashboard
> **Session**: <id> | **Date**: <YYYY-MM-DD> | **Trigger**: <auto|manual> | **Method**: <api|fallback|manual>

---

## 1. Continuation Prompt for Claude
[Self-contained prompt block in triple backticks — see template below]

---

## 2. Conversation Summary
[2–4 sentences covering objective, modules, and overall state]

---

## 3. Current Project / Repository Context
[Branch, phase, environment, stack versions]

---

## 4. User Goal
[High-level objective, not just the immediate task]

---

## 5. Active Task at Time of Compact
[Exact task: file, function, feature, Tasks.md reference]

---

## 6. Completed Work
[Bullet list of done items with file names where relevant]

---

## 7. Pending Work
[Bullet list of not-yet-started or incomplete tasks]

---

## 8. Important Decisions Made
[Table: Decision | Alternatives | Reason — decisions that must not be re-litigated]

---

## 9. Technical Requirements Mentioned
[Requirements from Requirements.md, Tasks.md, or stated by user]

---

## 10. Files Created or Modified
[Table: File Path | Status | Note]

---

## 11. Sensor Mode and Safety Constraints
[ALWAYS states current SENSOR_MODE (default mock), the Dracal serial E25877
constraint, and any other safety rules mentioned — see below]

---

## 12. Commands Already Run
[List with brief outcome for each]

---

## 13. Errors, Warnings, or Blockers
[Each with: description, resolution status (resolved/unresolved/bypassed)]

---

## 14. Relevant Paths
[Table: Path | Purpose — always includes project root, backend, frontend, docs, evidence]

---

## 15. Important Formulas, Rules, or Business Logic
[Humidity/temperature/dew-point evaluation rules, material profile thresholds,
drying recommendation logic from Requirements.md §8-9]

---

## 16. Current Implementation State
[What exists now vs. what is stub/placeholder — reference Tasks.md phases]

---

## 17. Next Recommended Steps
[3–5 specific, ordered, actionable steps with exact file/command]

---

## 18. Manual Recovery Instructions for User
[How to find file, copy prompt, paste in new session, verify, reference docs]

---

## 19. Timestamp and Session Metadata
[Session ID, date, trigger, transcript availability, method, hook name]
```

---

## SECTION 1 TEMPLATE — Continuation Prompt for Claude

Section 1 is the most important section. It must work standalone. Template:

```
Read this handoff document carefully. Use it as the source of truth for the
previous conversation context. Continue from the last active task without
restarting the project, without repeating completed work, and without
changing SENSOR_MODE away from mock unless explicitly instructed.

Project: 3D Print Materials Environment Data Monitoring Dashboard
Path: C:\Users\AllamRodriguez\Desktop\Programas\3D Print Materials Environment Data Monitoring Dashboard
Stack: Python 3.11 / FastAPI / SQLAlchemy / SQLite backend (backend/) +
       React / Vite / TypeScript frontend (frontend/)
Docs: docs/Requirements.md (source of truth) | docs/Tasks.md (task list)

<2-3 sentences: what was being done, in which file/module, current state>

SAFETY CONSTRAINTS — do not violate:
- SENSOR_MODE must default to `mock`; only switch to `dracal_vcp` when explicitly testing real hardware
- Dracal sensor serial number is E25877 — do not hardcode a different serial
- Never persist Alert rows from GET /readings/current polling — only POST /readings persists

After reading this document, confirm the active task and next step before
making any code changes. Your first action should be: <SPECIFIC ACTION>.
```

**Quality checklist for Section 1:**
- [ ] Mentions project name and path
- [ ] States stack clearly
- [ ] Describes active task with file/function specificity
- [ ] States what is done vs. not done
- [ ] Lists the sensor-mode/safety constraints
- [ ] Ends with one concrete first action
- [ ] No pronouns without antecedents ("the file" → name the file)
- [ ] Can be pasted cold into a new session without additional context

---

## SECTION 11 — Sensor Mode and Safety Constraints (ALWAYS INCLUDE)

These constraints must appear in section 11 of every handoff, regardless
of whether they were mentioned in the session:

```
SENSOR_MODE default: mock (do not change to dracal_vcp without explicit instruction)
Dracal sensor serial number: E25877 (do not hardcode a different serial)
Alert persistence: only POST /readings persists Alert rows; GET /readings/current
  computes and returns transient alerts without writing to the database
Do not overwrite docs/Requirements.md or docs/Tasks.md — they are the source of truth
Never commit .env, local SQLite database files, node_modules, or Python caches
```

Source: `docs/Requirements.md` §10, §13.3, §16 and root `CLAUDE.md`.

---

## SECTION 15 — Business Logic Reference

Always include the following evaluation rules when relevant to the session.
If the session was about alerts/drying/dew point, reproduce them in full:

**Humidity severity** (Requirements §8.1):
- `ok`: `RH <= ideal_rh_max_percent`
- `warning`: `ideal_rh_max_percent < RH <= warning_rh_max_percent`
- `critical`: `RH > warning_rh_max_percent` or `RH >= critical_rh_max_percent`

**Temperature severity** (§8.2): `ok` within material ideal range, `warning`
outside ideal but within warning range, `critical` outside critical range.

**Pressure** (§8.3): recorded for traceability only — alert ONLY on missing/
invalid values or sensor-parsing issues, never gates filament readiness alone.

**Dew point condensation risk** (§8.4):
- `warning` if `temperature_c - dew_point_c <= 3°C`
- `critical` if `temperature_c - dew_point_c <= 1°C`

**Material profile seed families** (§7): PLA, PETG/CPE, ABS, ASA, Nylon/PA,
PC, TPU/TPE, PVB, PVA, BVOH — each with ideal/warning/critical RH max,
drying temp, and drying time range. Manufacturer-specific profiles override
family defaults; derivatives inherit from parent family unless overridden.

**Drying recommendation** (§9): show material family, drying temp, min/max
drying time, and a check against the assigned dryer Location's `max_temp_c`.
Never imply the app directly controls the dryer.

---

## INDEX.md FORMAT

`.claude/context-handoffs/INDEX.md` is automatically maintained by the hook.
For manual updates, append a row in this format:

```markdown
| YYYY-MM-DD | HH:MM:SS | auto/manual | api/fallback/manual | Task summary | [filename](filename) |
```

---

## FALLBACK BEHAVIOR

When ANTHROPIC_API_KEY is not configured:

1. The hook uses heuristic extraction from the transcript (regex pattern matching)
2. Fidelity is lower — file paths, user messages, and tool calls are extracted
3. Section 15 (Business Logic) is populated with known project rules regardless
4. Section 11 (Sensor Mode / Safety Constraints) is always fully populated
5. The Continuation Prompt includes a note about fallback mode

To enable full-fidelity handoffs:
- Add `ANTHROPIC_API_KEY=sk-ant-...` to `backend/.env`
- Or set it as a system environment variable

---

## ANTI-PATTERNS

- **Vague active task**: "working on the backend" → should be "implementing
  `evaluate_humidity_severity()` in `backend/app/services/alert_service.py`"
- **Omitting the sensor-mode/safety constraints**: section 11 must always be complete
- **Skipping section 1**: it is the most important section — never omit or abbreviate it
- **Invented context**: if not in the conversation, write "(not determinable)"
- **Responding at length after compact signal**: keep it brief — the handoff is the priority
- **Not updating INDEX.md**: always append to the index after writing the handoff file
- **Using accented characters in filenames**: filename slugs must be `a-z`, `0-9`, `-`, `_` only
