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
| Security review | `/evidence/security-review.md` — reviewed `POST /readings` and related sensor/CORS/secrets handling, fixed 2 medium findings. Extended by a second pass during the final bug-sweep task covering code added afterward (SQLite FK enforcement, `auto_capture.py`) — see `docs/Final_Review_Bug_Sweep_Guide.md` | Done |
| GitHub Integration | Repo: https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard. Real actions: [Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1) (created + closed via `gh issue close`, see "Frontend Automated Tests" below) and [PR #2](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/pull/2) (created + merged via `gh pr create`/`gh pr merge`). GitHub MCP was confirmed configured in the user's Claude Code settings but inactive in these sessions due to a project-path casing mismatch (see "Final Assignment Compliance Review" below) — `gh` CLI used as the documented substitute throughout | Done (documented substitute) |
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

## Material Profile Manufacturer Override

Full task record: `docs/Tareas/material-profile-manufacturer-override/TASK.md`. Picked at Claude's
own discretion in response to "continua con lo que queda," after using an Explore agent to verify
this was a real requirements gap rather than one of the optional Bambu-Studio extras:
`docs/Requirements.md` §7 rule 1 ("Manufacturer-specific values override family defaults") and
`CLAUDE.md`'s Domain Rules both state this as a must, but investigation confirmed `MaterialProfile`'s
`manufacturer`/`variant` columns were always `null` in seed data, never queried against
`FilamentSpool.brand`, with no resolution logic anywhere — flat CRUD plus a user manually picking one
row from an unlabeled dropdown.

Seeded a real manufacturer-specific example ("Prusament PLA," sharing `family` with generic "PLA"
but with tighter RH thresholds, `source_notes` honestly marked illustrative rather than claiming a
real published Prusament spec). `SpoolForm.tsx` now suggests switching to the manufacturer-specific
profile when the typed brand matches one for the currently-selected family — a button the user
clicks, never a silent auto-switch. `Materials.tsx` gained a "Manufacturer" column so the override
relationship is visible per Requirements §7 rule 3. Deliberately no new backend endpoint: resolution
is a client-side lookup over the already-fetched profile list, matching this codebase's existing
pattern (e.g. `Printers.tsx` resolving a location's printer via `.find()`) rather than adding a route
nothing but the frontend would call.

Backend: 1 new pytest (seeded override profile's fields), plus a hardcoded seed-count assertion
fixed in `test_seed_idempotent.py`. Full suite: 132 passed. Frontend: `SpoolForm.test.tsx` (4 new
tests) covers no-hint/hint-shown/switch-and-hide/cross-family-no-match. Full vitest suite: 14 passed.
`tsc -b`/`build`/`lint` clean.

**Playwright verification**: the Playwright MCP server disconnected mid-task. The auto-mode
classifier itself blocked the merge-to-main attempt on this basis — `CLAUDE.md`'s Git Workflow
requires real-browser validation (or explicit user sign-off) before a UI change merges, and a
substitute (live `curl` + the vitest suite) wasn't accepted as sufficient for that gate. Asked the
user via `AskUserQuestion`; they chose to wait, reconnected the server themselves
(`/mcp reconnect all`), and a real browser check was then performed: `/materials` shows "Prusament"
in the new Manufacturer column (`evidence/frontend-verification/materials-manufacturer-column.png`);
on `/spools`, Material=PLA + Brand=Prusament shows the suggestion hint, and clicking "Use it"
switches the Material select to "Prusament PLA" and hides the hint
(`evidence/frontend-verification/spoolform-override-hint.png`).

## Alerts History Admin Page

Full task record: `docs/Tareas/alerts-history-admin-page/TASK.md`. Picked at Claude's own
discretion in response to "Continua con lo restante," after an Explore agent audited
`docs/Requirements.md` end-to-end (beyond the two already-known deferred items) and found a real
gap: §12.2 requires `GET /alerts` and `PATCH /alerts/{id}/resolve`, both fully implemented and
tested on the backend, but the frontend had zero consumer — `AlertPanel.tsx` only ever showed the
transient per-sensor alerts embedded in `GET /readings/current`, never the persisted history, and
nothing anywhere called resolve. Same class of gap as the manufacturer-override chain (Phase 25): a
documented, endpoint-backed rule with no consuming code.

Added a new `/alerts` page: status filter (All/Active/Resolved), severity filter, a table (severity
badge, metric, message, recommended action, resolved location name, created-at, status badge,
Resolve button for active rows only). Nav item with a `Bell` icon. `AlertPanel.tsx` (Dashboard's
per-sensor embedded alerts) intentionally left unchanged — it serves live "what's wrong right now"
status, a different job from this page's history/acknowledgment role.

Backend: no changes (already fully implemented and tested — 132 pytest passed, unaffected).
Frontend: `Alerts.test.tsx` (4 new tests: empty state, rendering, resolve behavior, no-button-when-
already-resolved). Full vitest suite: 18 passed. `tsc -b`/`build`/`lint` clean.

Playwright verification: triggered a critical humidity alert (plus a bonus warning dew-point alert)
via `POST /readings` against the seeded PLA spool's location; confirmed both render correctly on
`/alerts` with the right severity badges and resolved location name
(`evidence/frontend-verification/alerts-page-active.png`), then clicked "Resolve" on the humidity
alert and confirmed it switched to a green "Resolved" badge with the button gone, while the
dew-point alert stayed Active (`evidence/frontend-verification/alerts-page-resolved.png`).

## Drying Session Trend Chart

Full task record: `docs/Tareas/drying-session-trend-chart/TASK.md`. Picked at Claude's own
discretion in response to "Haz todo lo que consideres necesario y escencial de todo lo que falta"
— the last remaining item from the Requirements.md audit that ranked as a genuine gap:
§11.6 asks the app to let a user "review measured trend" while validating a drying session, but
`/drying` only showed a static sessions table, no chart. The two other previously-noted deferred
items (sensor-inheritance UI, `MaterialProfile` nozzle/bed-temp fields) were intentionally not
built — both already judged not to be real gaps.

Added a "View trend" button per drying-session row (shown when the session has a sensor assigned)
opening a dialog that reuses the existing `HistoryChart` component and `getReadingsHistory()` (no
new backend endpoint) over that session's own `started_at`..`ended_at ?? now` window. Only humidity
and temperature are charted — Domain Rules make humidity the primary readiness metric and pressure
secondary, so this focused view omits it (unlike `/history`, which rightly shows all three).

Backend: no changes (already fully implemented and tested — 132 pytest passed, unaffected).
Frontend: `DryingSessionTrendDialog.test.tsx` (4 new tests: closed/empty/populated states, correct
query args). Full vitest suite: 22 passed. `tsc -b`/`build`/`lint` clean.

Playwright verification: created a real drying session (spool #2 → Dry Box 1, "Mock Sensor 3"),
triggered an automatic sensor capture to produce a real reading at that location, clicked "View
trend" on `/drying`, and confirmed both the Relative Humidity and Temperature charts rendered the
real captured data point (`evidence/frontend-verification/drying-session-trend-dialog.png`).

## Sensor Per AMS Module

Full task record: `docs/Tareas/sensor-per-ams-module/TASK.md`. Raised by the user directly (not
from the Requirements.md audit) while asking what a previously-deferred item ("sensor-inheritance
resolution UI") would consist of — that explanation surfaced a distinct, real correction: a
physical AMS module has exactly one shared sensor covering all its slots' microclimate, but
`Sensor.location_id` could point at a single AMS-slot `Location`, and alert/affected-spool
evaluation only matched that exact `location_id`, never expanding to sibling slots.

**Plan Mode used again** for this correction: two parallel Explore agents (backend sensor/location
coupling; frontend AMS display components) audited the codebase before any file was touched. Key
finding: no pre-existing violation in seed data (clean slate), and `PrinterDetail.tsx` already
grouped sensor entries by printer rather than exact slot, so the Dashboard/PrinterDetail
"Environment" display already worked correctly without change — the real gaps were the backend
evaluation logic, missing validation, and misleading frontend labels. The plan was saved and
approved via `ExitPlanMode` before implementation began.

Backend: `alert_service.get_affected_spools` now expands to every sibling `Location` sharing
`(printer_id, location_type)` — generalized, not hardcoded to `"printer_ams"` — backing all 3
alert/reading flows in one place. New `sensor_service._check_ams_sensor_conflict` (same 400 pattern
as the existing duplicate-serial check) rejects a second sensor on an already-covered AMS module.
Seed gained a demo sensor + spool on different slots of the same AMS, since no seeded module
previously demonstrated the shared-sensor behavior. 6 new tests; full suite: 138 passed.

Frontend: new `describeSensorLocation()` helper relabels an AMS-slot reading by its printer
("P1S #1 — AMS") instead of the misleading exact slot name, used in `SensorReadingSection.tsx`
(Dashboard + PrinterDetail) and the `Sensors.tsx` admin table. `SensorForm.tsx`'s location picker
collapses an AMS module's slots to one option. Discovered and fixed a jsdom gap along the way:
Radix `<Select>` needs `hasPointerCapture`/`scrollIntoView`, which jsdom doesn't implement — added
the standard polyfill to `src/test/setup.ts`. Full vitest suite: 31 passed (9 files). `tsc -b`/
`build`/`lint` clean.

Playwright verification (after deleting the dev DB, since the seed's spool-seeding block only runs
when the spools table is empty, and this DB already had spools from prior sessions):
`/printers/5` shows the shared sensor correctly labeled "P1S #1 — AMS" and correctly lists a spool
from a *different* AMS slot as affected, proving the sibling-expansion fix
(`evidence/frontend-verification/printer-detail-shared-ams-sensor.png`); on `/sensors`, the
location picker showed one collapsed "P1S #1 — AMS" option, and attempting to assign a second
sensor to that same AMS module correctly failed with a 400
(`evidence/frontend-verification/sensors-ams-conflict-error.png`).

## Dashboard Device-Module Visual Redesign

Full task record: `docs/Tareas/dashboard-device-redesign/TASK.md`. Full architecture writeup:
`docs/Dashboard_Device_Redesign_Guide.md`. The user reviewed the earlier Bambu-Studio-inspired
redesign (Phase 18) and found the Dashboard itself still "too simple, not representative, no
strong visual identity" against the reference images (Bambu Studio's device/AMS panel). Planned
via Plan Mode with 3 parallel Explore agents + 1 Plan agent before implementation.

Key finding that simplified the whole task: almost everything needed already existed on
`/printers/:id` (`AmsSlotGrid`, `AmsSlotButton`, `SlotAssignmentModal`, `HumidityScale`,
`ColorSwatch`, `StatusBadge`) — this was about porting that already-built pattern to the Dashboard,
grouped by printer/location instead of by raw sensor, not building a new visual system.

New: `lib/deviceModules.ts` (grouping logic), `lib/deviceType.ts` (icon/label mapping),
`DeviceTypeIcon`, `EnvMetricTile`, `ExternalSpoolSlot`, `DeviceModuleCard`, `StandaloneLocationCard`,
`DeviceModuleGrid`. `Dashboard.tsx` rewritten to compose them. `PrinterDetail.tsx`,
`SensorReadingSection.tsx`, `AlertPanel.tsx`, `AffectedSpoolsPanel.tsx`, `ReadingCard.tsx`,
`AmsSlotGrid.tsx`, `SlotAssignmentModal.tsx`, `HumidityScale.tsx` all left unmodified — imported and
composed only, so `/printers/:id` carries zero regression risk. No new dependency added.

Seed: added a demo `printer_external_spool` `Location` (A1 mini #2) + spool, since no such location
had ever been seeded, so the new external-spool slot visual had nothing real to demonstrate against.

While building the new components, discovered a real gap: neither `DeviceModuleCard` nor
`StandaloneLocationCard` initially showed the sensor's serial/type/timestamp, which
`docs/Requirements.md` §11.1 explicitly requires ("timestamp and source mode: real or mock"). Fixed
before finalizing by adding a small subtext row to both.

Tests: `lib/deviceModules.test.ts`, `lib/deviceType.test.ts`, `EnvMetricTile.test.tsx`,
`DeviceModuleCard.test.tsx`, `StandaloneLocationCard.test.tsx` (new); `Dashboard.test.tsx` updated
to the new tree, same 4 state-coverage intent (loading/error/empty/populated). Full vitest suite:
60 passed (14 files). `tsc -b`/`build`/`lint` clean. Backend suite (seed-only change): 138 passed.

Playwright verification: `/` shows every seeded printer as a device module; AMS printers render
real, editable slot grids (P1S #1's A3 correctly surfaces the `sensor-per-ams-module` task's demo
spool via the shared-sensor expansion); the new external-spool demo location renders the "Ext"
slot with its spool; empty states render correctly for unconfigured printers; clicking a slot opens
the existing `SlotAssignmentModal`; standalone locations render as their own simpler modules; light
mode confirmed consistent. Screenshots:
`evidence/frontend-verification/dashboard-device-modules.png`,
`evidence/frontend-verification/dashboard-slot-modal.png`,
`evidence/frontend-verification/dashboard-light-mode.png`.

## Final Delivery Review — 2026-07-14

Full-project audit requested explicitly for delivery readiness: structure, `README.md`,
`CLAUDE.md`, `docs/Requirements.md`, `docs/Tasks.md`, all of `/docs`, `backend/`, `frontend/`,
`.claude/agents`/`hooks`/`skills`/`settings.json`, `.gitignore`, `.env.example`, and Git state
(`git status`, `git branch`, `git remote -v`) — all reviewed before any file was touched. This
followed directly after the "Final Review: Full-Stack Bug Sweep" (see below) merged via
[PR #2](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/pull/2, commit
`1d371c3`), so this pass focused on polish/documentation rather than re-auditing code just fixed.

**What was audited:**
- Confirmed no `ruff`/`mypy` config exists anywhere in `backend/` (not in `requirements.txt`, no
  config file) — per instruction, these were **not** run (only tools actually configured in the
  project are executed).
- `.claude/hooks/`: found 4 scripts (`quality-frontend.py`, `quality-python.py`,
  `session-summary.py`, `audit-posttooluse.py`) present on disk but never wired into
  `settings.json`. Evaluated each for whether it could be adapted to real use before deciding to
  remove: `quality-python.py` shelled out to `ruff`, which this project has never depended on —
  reviving it would mean adding a new dependency, which contradicts the project's own "avoid
  unnecessary dependencies" convention, so it was deleted rather than adapted.
  `session-summary.py`/`audit-posttooluse.py` duplicated, with a strictly worse implementation
  (plain-text logs in a non-standard `exports/logs/` location never used elsewhere in this repo),
  what the already-active `evidence-logger.py` (structured JSONL to `evidence/`) and the
  context-handoff system already do — deleted as genuinely redundant.
  `quality-frontend.py` shelled out to `eslint`, which was never installed in this project either
  (the actual linter is `oxlint`, already a `frontend` devDependency and this project's own `npm
  run lint` script) — this one **was** adaptable with zero new dependencies, so it was fixed to
  call `oxlint` (verified working via a manual hook invocation, both on a clean file and on a file
  with a real lint violation) and wired into `PostToolUse` alongside `evidence-logger.py`.
  `run-backend-tests-after-edit.py` was left untouched — it already self-documents as an
  intentionally-disabled optional template, not orphaned/confusing content.
- `.env.example`: found `AUTO_CAPTURE_INTERVAL_SECONDS` (a real `core/config.py` setting, added
  during the prior bug-sweep task) was never documented there. Added.
- `README.md`: found the test count ("116+") stale (actual: 170 backend / 160 frontend), no
  frontend validation commands documented, and no mention of the dashboard admin-control features
  shipped since the file was last touched (notification bell, printer status, embedded sensor
  assignment, AMS/external-spool switching, persistent filters, background auto-capture). Updated
  all three.
- Backend/frontend code itself: no changes needed — the prior bug-sweep task had just finished a
  thorough pass (3 parallel subagent reviews + live reproduction of every finding); re-auditing the
  same code minutes later would have been redundant, so this pass verified current state via a
  fresh full test run rather than re-reviewing line-by-line.

**Commands executed:**
```
cd backend && pytest -q
cd frontend && npx tsc -b && npm run build && npm run lint && npx vitest run
```
Plus live functional smoke tests (dev servers already running): direct `curl` against all three
required endpoints (`GET /readings/current`, `POST /readings`, `GET /readings?from=&to=`), the
AMS one-sensor-per-module conflict rule, and the duplicate-serial rule; Playwright MCP browser
checks of `/`, `/sensors`, and `/printers` (zero console errors on any); a full-page Dashboard
screenshot confirming 2-decimal environmental formatting, correct active/inactive/unassigned sensor
states, and Drying Recommendations matching the spools actually shown in warning/critical alerts.

**Results:**
- `pytest -q`: **170 passed**.
- `npx tsc -b`: clean.
- `npm run build`: clean (same pre-existing "chunk > 500kB" size warning as before, not an error —
  documented as a deferred improvement opportunity in `docs/Final_Review_Bug_Sweep_Guide.md`).
- `npm run lint`: clean — same 6 pre-existing `only-export-components` warnings as before (not
  errors), nothing new.
- `npx vitest run`: **160 passed** (28 files).
- All 3 required endpoints: 200 OK with real data. Both validation rules: correctly rejected with
  400, no side effects (no rows created by the rejected requests).

**Git/GitHub action:** committed directly to `main` per explicit user instruction (small,
non-functional documentation/config changes — no feature branch needed for this pass). Commit
[`a970338`](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/commit/a970338)
("chore: final project polish — clean up orphaned hooks, document auto-capture env var, refresh
README"), pushed to `origin/main`. This `EVIDENCE.md` update is committed separately immediately
after.

**Known limitations (unchanged, documented previously, not re-litigated here):** no Alembic/
migration tool (schema changes require deleting the dev SQLite DB); AMS slot count fixed at 4; no
route-based code splitting yet (main JS chunk ~880kB); a few list pages lack a distinct
loading/error state (`Alerts.tsx`, `Drying.tsx`, `Printers.tsx`, `Materials.tsx`, `Sensors.tsx`,
`Spools.tsx`); GitHub MCP was never connected in any session — the `gh` CLI was used throughout as
the explicitly-authorized substitute. Full list: `docs/Final_Review_Bug_Sweep_Guide.md`.

## Final Assignment Compliance Review — 2026-07-14

**Documento base:** `docs/asignacion_react_fastapi.pdf` ("Dashboard de Monitoreo Ambiental en
Tiempo Real," Phoenix Calibration DR) — read in full and used as the literal source of truth for
this review, distinct from (and narrower than) the extended `CLAUDE.md`/`docs/Requirements.md`
scope this project actually built against.

**Checklist generado:** `docs/Final_Assignment_Compliance_Checklist.md` — maps every requirement
in the assignment PDF (stack, 3 casos de uso, 8 temas de Claude Code, entregables, criterios de
evaluación) to its exact evidence location in this repository.

**Hallazgo principal:** nothing was missing or broken. The project satisfies every literal
requirement; the only real gap found was one of *presentation clarity* for an evaluator — the
8-theme Claude Code evidence (40% of the grade) was accurate but spread across ~30 build phases in
this file's narrative, with no single document mapping the assignment's exact wording to exact
evidence. `docs/Final_Assignment_Compliance_Checklist.md` closes that gap.

**GitHub MCP re-check:** the user reported GitHub MCP was now available. Verified via `ToolSearch`
(no GitHub-specific MCP tools surfaced) and by inspecting Claude Code's own settings
(`~/.claude.json`): a `github` MCP server **is** configured, but under a project-path entry whose
drive-letter casing (`C:/...`) differs from the active session's working directory (`c:/...`) —
Claude Code treats these as two different project keys, so the server never loads into this
session. This is a real, environment-level technicality, not a missing setup step on the user's
part. Documented as a partial/substitute-compliant item in the checklist (§3, item 6) rather than
silently claimed as fully resolved — the existing `gh` CLI evidence (Issue #1, PR #2) already
satisfies the assignment's own explicit allowance for a documented substitute.

**Cambios realizados:**
- New `docs/Final_Assignment_Compliance_Checklist.md`.
- This section, plus tightened the "Security review" and "GitHub Integration" rows in the
  checklist table above with the newest evidence (second security pass, PR #2, the MCP
  casing finding).
- No backend/frontend code changes — the prior final bug-sweep task had just finished a thorough
  correctness pass; re-touching that code minutes later would have been unjustified churn.

**Comandos ejecutados y resultados:**
```
cd backend && pytest -q                    → 170 passed
cd frontend && npx tsc -b                  → clean
cd frontend && npm run build                → clean (pre-existing >500kB chunk notice, not an error)
cd frontend && npm run lint                 → clean (6 pre-existing warnings, no errors)
cd frontend && npx vitest run               → 160 passed, 28 files
```
`ruff`/`mypy` not run — neither is configured in this project.

**Revisión de seguridad:** re-confirmed `evidence/security-review.md` (POST /readings, the
assignment's own most-critical-endpoint candidate) remains valid and its fixes are still in place;
no new security concerns found in this pass since no code changed.

**Revisión de requisitos de Claude Code:** all 8 themes re-verified individually against the
assignment's exact wording — see `docs/Final_Assignment_Compliance_Checklist.md` §3 for the
item-by-item mapping.

**Estado final:** ✅ compliant against `docs/asignacion_react_fastapi.pdf` in full, with one item
(#6, GitHub MCP) marked as a documented substitute rather than a literal MCP action, per the
assignment's own stated allowance for that exact scenario.

**Limitaciones conocidas:** see `docs/Final_Assignment_Compliance_Checklist.md`'s own
"Limitaciones conocidas" section (GitHub MCP casing mismatch, no Alembic, project scope
intentionally exceeds the assignment's 3-endpoint minimum).

## Notes

Do not mark anything complete until the action has actually been performed in Claude Code or GitHub.
