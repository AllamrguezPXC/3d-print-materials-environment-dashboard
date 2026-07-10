# EVIDENCE.md

# Claude Code Evidence

Use this file to document evidence required by the assignment.

## Checklist

| Requirement | Evidence | Status |
|---|---|---|
| Plan Mode + Ask Mode | Plan Mode used to audit `.claude`/produce the build plan (see below); Ask Mode used via `AskUserQuestion` for .claude cleanup strategy, Git/GitHub setup, and dryer modeling decisions | Done |
| `/init` and `CLAUDE.md` | Root `CLAUDE.md` audited and extended with Task Documentation, Git Workflow, Testing Requirements, and Playwright MCP sections adapted from `Inpiration CLAUDE.md` | Done |
| TDD cycle | `/evidence/tdd-current-reading-fail.txt` and `/evidence/tdd-current-reading-pass.txt` — see summary below | Done |
| Documentation | Root `README.md` (setup, stack, sensor modes, endpoints, structure), `backend/README.md`, `frontend/README.md`, `docs/Requirements.md`, `docs/Tasks.md`, root `CLAUDE.md`, structured `<summary>` docstring on `MaterialProfile` (`backend/app/models/material_profile.py`) | Done |
| Security review | `/evidence/security-review.md` — reviewed `POST /readings` and related sensor/CORS/secrets handling, fixed 2 medium findings | Done |
| GitHub Integration | Repo: https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard. Real action: [Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1) "Add automated frontend tests (vitest) for Dashboard and theme toggle" | Done |
| Custom Skill | `.claude/skills/*/SKILL.md` — `context-handoff` skill adapted from an unrelated prior project to this one; `fastapi-endpoint-builder` used to build `GET /readings/current` | Done |
| Custom Hook | `.claude/hooks/*`, `.claude/settings.json` — `guard-dangerous-commands.py` and `evidence-logger.py` active from the start; `pre-compact-context-handoff.py` adapted and wired into `PreCompact`, verified via `test-fixtures/precompact-auto.json` | Done |

## Plan Mode / Ask Mode

Before any implementation, Plan Mode was used to read `docs/Requirements.md`, `docs/Tasks.md`,
`docs/Prompt_Pack.md`, `CLAUDE.md`, the existing `.claude/` folder, and `Inpiration CLAUDE.md`,
then audit which `.claude` agents/hooks/skills were reusable, adaptable, or leftover from an
unrelated prior project ("PAUL Dashboard Data Analisis"). The resulting plan was saved and
approved before any file was modified. `AskUserQuestion` (Ask Mode) was used three times during
planning to resolve decisions that were the user's to make: how to handle the stale `.claude`
content (adapt the context-handoff system, delete the rest), how to set up Git/GitHub given no
GitHub MCP server was connected, and how to model dryer capability in the data model.

## GitHub Integration Note

No GitHub MCP server was connected in this Claude Code session (only `markitdown` and
`playwright` MCP tools were available). Per explicit user instruction, GitHub setup was performed
directly with the `gh` CLI instead: `git init`, initial commit, `gh repo create ... --push`. This
is documented here as satisfying the GitHub-integration requirement in spirit.

Real GitHub action performed: `gh issue create` opened
[Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1),
tracking genuine follow-up work (automated frontend test coverage per Requirements.md §15.2,
optional for this assignment but a real gap — the frontend was only verified manually via
Playwright MCP, see below) rather than a retroactive issue for work already completed.

## TDD Cycle — `GET /readings/current`

1. Wrote `backend/tests/api/test_readings_current.py::test_get_current_reading_returns_mock_data`
   against the not-yet-existing route.
2. Ran `pytest` — failed with `404` (route did not exist). Captured to
   `evidence/tdd-current-reading-fail.txt`.
3. Implemented the minimum: `SensorReadingDTO`, the `SensorReader` protocol, `MockSensorReader`
   (bounded random walk + daily sinusoid + rare spikes, clamped to realistic bounds),
   `DracalVcpSensorReader` (VCP line parser), the sensor factory, `environment_service` (dew point
   + current-reading assembly), and the `GET /readings/current` route.
4. Re-ran `pytest` — passed. Captured to `evidence/tdd-current-reading-pass.txt`.
5. Added unit tests for the sensor layer alongside this cycle: mock-sensor bounds/drift
   (`tests/sensors/test_mock_sensor.py`) and the Dracal VCP parser — valid line, malformed line,
   wrong serial, missing channel, non-numeric channel (`tests/sensors/test_dracal_vcp_parser.py`).
6. Full suite: `cd backend && pytest` — 11 passed.

## Frontend Browser Verification (Playwright MCP)

With both `uvicorn` (backend) and `npm run dev` (frontend) running locally, drove the app with
Playwright MCP rather than relying on `npm run build`/type-check alone:

1. Dashboard (`/`) — confirmed live polling of `GET /readings/current` renders temperature/RH/
   pressure/dew point cards, sensor serial `E25877`, and `source: mock`. Screenshot:
   `evidence/frontend-verification/dashboard-dark.png`.
2. Theme toggle — clicked "Light mode", confirmed the whole UI re-themes via the `data-theme`
   attribute and persists. Screenshot: `evidence/frontend-verification/dashboard-light.png`.
3. History (`/history`) — clicked "Capture reading now" twice, then loaded hourly history;
   confirmed the three separate single-axis Recharts line charts (temperature/humidity/pressure)
   render real data points. Screenshot: `evidence/frontend-verification/history-chart.png`.
4. Materials (`/materials`) — confirmed all 10 seeded material profile families render in the
   editable table. Screenshot: `evidence/frontend-verification/materials-page.png`.
5. Printers & Locations (`/printers`) and Spools (`/spools`) — confirmed the 7 seeded printers, 3
   demo locations, and 2 demo spools (with resolved assignment/location names) render correctly.
6. End-to-end alert + drying flow — posted a manual reading with `relative_humidity_percent: 90`
   at the seeded "AMS Slot 1 - A1 mini #1" location (PLA spool, critical RH max 60%) via
   `POST /readings`; confirmed a `critical` humidity alert and a `warning` dew-point alert were
   created, then navigated to `/drying` and confirmed the recommendation card renders with the
   correct material, temperature/time, and the required "advisory only — does not control the
   dryer" language. Screenshot: `evidence/frontend-verification/drying-recommendation.png`.

## Sensor Architecture Refactor — Remove Global `SENSOR_MODE`

Full task record: `docs/Tareas/eliminar-sensor-mode-global/TASK.md`.

**Motivation (security-relevant bug found during audit):** the previous global `get_sensor_reader(settings)`
factory seeded the single cached `MockSensorReader` with `settings.dracal_serial_number` — meaning
in `SENSOR_MODE=mock`, the mock sensor reported the *real* hardware serial `E25877`
(`backend/tests/api/test_readings_current.py` previously asserted this directly). A mock sensor
impersonating the real hardware's identity is a data-integrity/trust problem worth fixing on its
own, independent of the rest of the refactor.

**Plan Mode:** used again for this task — 3 parallel Explore agents audited the backend sensor
model/factory/endpoints, the readings services, and the frontend/docs impact before any file was
touched; a Plan agent then produced the concrete design (per-row `Sensor` validation, new
`get_sensor_reader_for_sensor(sensor)` factory, list-shaped `GET /readings/current`/`POST /readings`
responses); the plan was saved and approved via `ExitPlanMode` before implementation began.

**TDD-style cycle:** for each phase, tests were written/rewritten alongside the implementation and
the full suite re-run before moving to the next phase (`backend/tests/sensors/test_factory.py` and
`backend/tests/services/test_environment_service.py` are new; `test_sensors.py`,
`test_readings_current.py`, `test_readings_post.py`, `test_seed_idempotent.py` were extended/rewritten).
Final backend suite: **110 passed, 0 failed** (`cd backend && pytest -q`).

**Security-relevant validation added** (`backend/app/services/sensor_validation.py`, wired into
`sensor_service.create_sensor`/`update_sensor` and the startup seed script): a mock sensor can never
be created or updated to use the real serial `E25877`; mock sensors must use an unambiguous
`MOCK-`-prefixed serial; Dracal-type sensors require a non-empty `port`; duplicate serials are
rejected with a friendly 400 instead of surfacing a raw `IntegrityError` as an unhandled 500.

**Frontend verification (Playwright MCP):** with both dev servers running against a fresh seeded
database, confirmed (screenshots in `evidence/frontend-verification/`):
- `dashboard-multi-sensor.png` — 4 sensor sections render (1 real + 3 mock); the real Dracal
  sensor's section shows an isolated `Sensor unavailable: ...` error banner while the 3 mock
  sensors show independent, differing temperature/humidity/pressure values and the topbar badge
  reads "3/4 sensors online".
- Deactivating all sensors via a direct DB update and reloading showed the empty state ("No active
  sensors configured.") and a "No sensors configured" topbar badge — confirmed no reading is ever
  synthesized when zero sensors are active.
- `dashboard-light-theme-alert.png` — theme toggle still re-themes the whole page correctly, and a
  live humidity warning alert appears scoped to only the affected mock sensor's section.
- `/settings` — the rewritten "Sensors" card correctly describes per-row configuration instead of
  the removed `SENSOR_MODE` env var.

## Notes

Do not mark anything complete until the action has actually been performed in Claude Code or GitHub.
