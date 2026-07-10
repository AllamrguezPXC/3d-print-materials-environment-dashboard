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
| GitHub Integration | Repo: https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard. Real action: [Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1) "Add automated frontend tests (vitest) for Dashboard and theme toggle" — opened, then implemented and closed via `gh issue close` (see "Frontend Automated Tests" below) | Done |
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

## Printer Detail / AMS Slot Grid / Sensor Port Detection (Phase 1)

Full task record: `docs/Tareas/printer-ams-sensor-config/TASK.md`.

A large Bambu-Studio-inspired redesign was requested (17 sections: printer control view, AMS slot
grid, slot modal, dual-mode "Add Filament", DRY→WET humidity scale, Filament Manager redesign,
sensor port auto-detection, printer filament-system-type configuration, material-profile expansion).
Plan Mode audit (3 parallel Explore agents + 1 Plan agent) confirmed this was fully greenfield — no
AMS/slot model, no serial port scanning, no sensor test-read endpoint existed anywhere. Given
`CLAUDE.md`'s explicit "keep the MVP focused" constraint, `AskUserQuestion` was used to confirm
scope with the user, who chose a right-sized Phase 1 over attempting the full 17-section prompt in
one pass; Phase 2+ items are listed as explicit deferred follow-up in `docs/Frontend_Redesign_Guide.md` §9.

**Backend**: `Location.slot_index` (one new nullable column, no new model); `GET /sensors/ports`
(wraps `serial.tools.list_ports.comports()`, zero new dependencies) and
`POST /sensors/{id}/test-read` (wraps the existing per-sensor reader factory, never persists a
`Reading`). 116/116 backend tests pass (6 new, covering slot ordering and mocked port/test-read
behavior with no real-hardware dependency).

**Frontend verification (Playwright MCP)**, screenshots in `evidence/frontend-verification/`:
- `printer-detail-ams-humidity.png` — `A1 mini #1`'s detail page reuses `SensorReadingSection`
  unmodified with its real mock-sensor reading, a `HumidityScale` grade "A" computed from that
  reading against the assigned PLA spool's RH bands, and an AMS slot showing the real assigned
  spool (`PLA / Black / ready`).
- `P1S #1` (printer id 5) renders a real 4-slot AMS grid (A1-A4, all correctly empty — no spool
  assigned there); clicking a slot opens `SlotAssignmentModal`, correctly reporting "This slot is
  empty" and "No unassigned spools available" since both seeded spools are already assigned
  elsewhere — no fabricated data.
- `A1 mini #2` (no seeded AMS) shows the explicit "No AMS configured on this printer" state, not a
  fabricated grid — confirmed the "never invent AMS" constraint holds.
- `sensors-page-port-scan.png` — `/sensors` lists all 4 configured sensors; a live port scan
  returned real detected COM ports on the host; test-read against a mock sensor returned a real
  inline reading; `POST /sensors` with `sensor_type="mock"` and `serial_number="E25877"` still
  returns 422 through this new UI's own create form path.

## Real-Hardware Validation — DracalCliSensorReader (`dracal_cli`)

Full task record: `docs/Tareas/dracal-cli-sensor-reader/TASK.md`.

Live end-to-end validation of Phase 18's port-detection feature against the user's actual Dracal
sensor (serial `E27297`) uncovered that it exposes **no COM port at all** — `GET /sensors/ports`
correctly returned only the host's 3 real ports (none of them the sensor), confirmed authoritative
via `HKLM\HARDWARE\DEVICEMAP\SERIALCOMM` and Device Manager, which shows the device
(`USB\VID_289B&PID_0505\E27297`) under the generic `USBDevice` class rather than "Ports (COM &
LPT)" — its Windows driver isn't in VCP/CDC mode, even though Dracal's own CalView software reads
it fine over native USB. Rather than fabricate a COM-port connection that doesn't exist, this was
reported to the user, who provided Dracal's official `dracal-usb-get` CLI approach for exactly
this case — matching the `sensor_type="dracal_cli"` already reserved in `VALID_SENSOR_TYPES` but
never implemented (`docs/Tasks.md` previously marked it explicitly out of scope).

Implemented `DracalCliSensorReader` (`backend/app/sensors/dracal_cli.py`), wired into the existing
per-sensor factory, with `sensor_validation.py` relaxed so only `dracal_vcp` (a real COM port)
requires a `port` — `dracal_cli` identifies its device via `serial_number` alone. New tests mock
`subprocess.check_output` (no dependency on the real CLI binary or hardware in CI); full backend
suite: 124 passed.

**Live registration and verification**: created a location `P1S-003`, registered a `Sensor` row
(`sensor_type="dracal_cli"`, `serial_number="E27297"`, no `port`), and confirmed:
- `POST /sensors/5/test-read` returned a real, non-fabricated reading (`23.72°C / 47.21% RH /
  101040 Pa`) matching what Dracal's own CalView tool showed live for the same device.
- `GET /readings/current` correctly listed the sensor as `source: "real"`, `error: null`, alongside
  the seeded (non-functional, no real hardware attached) `E25877` `dracal_vcp` entry showing its
  own isolated connection error — confirming per-sensor error isolation holds across sensor types.
- Dashboard screenshot: `evidence/frontend-verification/dashboard-real-dracal-cli-sensor.png` — the
  `E27297` section renders with real temperature/RH/pressure/dew-point values under location
  "P1S-003", and the topbar badge correctly reads "4/5 sensors online".

## Add Filament: Manual Add / Read from AMS

Full task record: `docs/Tareas/read-from-ams-flow/TASK.md`. First item picked (via
`AskUserQuestion`) from Phase 18's documented Phase 2+ deferred list. Frontend-only, no backend
changes — reuses the AMS slot data (`Location.slot_index`) and `spoolsApi`/`assignmentsApi` already
built. Playwright MCP verification, screenshot `evidence/frontend-verification/read-from-ams-import.png`:
opened "Add Filament" on `/spools`, switched to "Read from AMS", selected `P1S #1` (the only other
seeded AMS besides `A1 mini #1`, whose single slot correctly showed as disabled/"Assigned"),
multi-selected 2 of its 4 empty slots, filled in one shared material (ASA / Bambu Lab / Gray), and
confirmed a single submit created 2 real spools assigned to `AMS Slot 1`/`AMS Slot 2 - P1S #1` —
visible immediately in both `/spools`'s table and `PrinterDetail`'s AMS grid (A1/A2 now loaded,
A3/A4 still empty, no fabricated data).

## Filament Manager: Filters, Search, Grouping, Edit/Delete

Full task record: `docs/Tareas/filament-manager-redesign/TASK.md`. Second item picked from Phase
18's deferred list, chosen at Claude's own discretion per the user's explicit "continue with
whichever you think is best." Frontend-only (no planned backend changes; see the bug fix below).

Playwright MCP verification, screenshot `evidence/frontend-verification/filament-manager-filters.png`:
- AMS scope filter correctly reduced the table to only the spool assigned to a `printer_ams`
  location; free-text search for a non-matching string correctly showed "No filaments match your
  filters." (distinct from the "no spools at all" empty state).
- Grouping by printer split the table into an "A1 mini #1" card and a "No printer" card (for the
  spool assigned to `Storage Box A`, which has no `printer_id`).
- Edit: changed a spool's color, confirmed the change persisted in the table immediately, and
  confirmed the reused `SpoolForm`'s submit button correctly read "Save changes" here (not the
  Manual-Add tab's "Add spool" — added a `submitLabel` prop to disambiguate).
- Delete: confirmed the native `window.confirm` prompt, then verified both outcomes — deleting a
  spool with an active assignment correctly returned the backend's existing friendly 400
  ("cannot be deleted because it is referenced by other records"); deleting an unassigned spool
  succeeded and removed it from the table.

**Pre-existing bug found and fixed during this verification** (not part of the original task
scope, but directly blocking it): `backend/app/schemas/filament_spool.py`'s `FilamentSpoolBase`
declared `color: str` (required) and `backend/app/models/filament_spool.py`'s column was
non-nullable — while every frontend surface (types, `SpoolForm`, `ReadFromAmsPanel`, display
fallbacks like `s.color ?? "—"`) already treated color as optional. Submitting "Add Filament" with
a blank color silently returned a 422 the UI didn't surface clearly. Confirmed via
`POST /spools` returning `422 Unprocessable Content` in the backend log, then fixed both files to
`str | None = None`, added two regression tests (create-without-color succeeds; delete blocked by
an active assignment returns 400), and re-verified the exact same "Add Filament" flow succeeds
end-to-end with an empty Color field. Full backend suite: 126 passed.

## Filament Color Swatch Picker

Full task record: `docs/Tareas/filament-color-swatch/TASK.md`. Third item picked from Phase 18's
deferred list, at Claude's discretion. Frontend-only, no backend changes — `FilamentSpool.color`
remains the existing free-text string; no hex/RGB column exists to persist a real color value, so
this is built honestly as a best-effort color-name-to-CSS display mapping plus a preset picker,
not a fabricated precision color store.

Playwright MCP verification, screenshots in `evidence/frontend-verification/`:
- `color-swatch-table.png` — the Filament Manager table shows a filled black dot next to "Black"
  and a filled orange dot next to "Orange" for the two seeded spools.
- `color-swatch-picker.png` — the Add Filament modal's Color field shows a live preview swatch (a
  neutral dashed ring when empty) plus a row of 14 clickable presets (Black through Transparent).
- `color-swatch-preset-selected.png` — clicking "Blue" filled the text field with "Blue" and
  updated the preview swatch to blue.
- `color-swatch-ams-grid.png` — `PrinterDetail`'s AMS slot card for `A1 mini #1` shows the same
  black swatch next to "Black" alongside the real sensor reading and humidity scale.

## Printer Filament System Type

Full task record: `docs/Tareas/printer-filament-system-type/TASK.md`. Fourth item picked from
Phase 18's deferred list, at Claude's discretion. Adds `Printer.filament_system_type` (AMS /
External Spool / Storage-only / Manual) as editable, validated configuration — purely descriptive,
does not change the existing AMS-grid inference (still derived from real `printer_ams` `Location`
rows), avoiding two competing sources of truth for "does this printer have AMS."

Backend: model/schema/service-layer validation (422 on an unrecognized enum value for both create
and patch), seed updated so `A1 mini #1`/`P1S #1` → `"ams"` (matching their real seeded AMS
`Location` rows) and every other seeded printer → `"external_spool"`. 5 new tests; full backend
suite: 131 passed.

Playwright MCP verification, screenshot `evidence/frontend-verification/printer-filament-system-type.png`:
- `/printers` — new "Filament System" column shows `ams`/`external spool` for the seeded printers.
- `/printers/1` (A1 mini #1) — header now reads "Bambu Lab A1 mini · Ams" (shown in the screenshot).
- Created a test printer via the form selecting "storage only" from the new `Select`, confirmed it
  saved and displayed correctly in the table (`storage only`), then deleted it to leave seed data
  unchanged.

`tsc -b`/`build`/`lint` clean throughout.

## Frontend Automated Tests (Vitest)

Full task record: `docs/Tareas/frontend-vitest-setup/TASK.md`. Closes
[GitHub Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1),
which had been opened earlier this session as the real GitHub-integration evidence action but never
implemented — `CLAUDE.md`'s own Testing Commands section already listed `cd frontend && npx vitest
run`, yet no Vitest config or testing-library dependency had ever existed in `frontend/`.

Installed `vitest` + `@testing-library/react`/`jest-dom`/`user-event` + `jsdom`; added a `test`
block to the existing `vite.config.ts` (reusing its `@/` alias and plugins) plus `src/test/setup.ts`
(`jest-dom` matchers, explicit RTL `cleanup()` in `afterEach`). Three test files, matching all three
acceptance criteria from the issue:
- `ThemeToggle.test.tsx` — default (dark) state, a pre-set `localStorage` value respected on mount,
  toggling flips the visible label + `data-theme` + `localStorage` in both directions.
- `Dashboard.test.tsx` — mocks `getCurrentReading` (`@/api/readings`) and `dryingApi.recommendations`
  (`@/api/config`) under a real `QueryClientProvider`; covers loading, backend-unreachable error,
  no-active-sensors empty state, and populated sensor + drying-recommendation rendering.
- `AlertPanel.test.tsx` — empty state, a warning-severity humidity alert, a critical-severity
  temperature alert with a recommended action.

`npm run test` (`vitest run`): 10 passed. `tsc -b`/`build`/`lint` clean. Backend suite unaffected —
131 passed (no backend changes in this task). `npm run test` documented in `frontend/README.md` and
root `CLAUDE.md`'s Testing Commands. Issue #1 closed via `gh issue close 1` with a summary comment
linking the implementation.

## Notes

Do not mark anything complete until the action has actually been performed in Claude Code or GitHub.
