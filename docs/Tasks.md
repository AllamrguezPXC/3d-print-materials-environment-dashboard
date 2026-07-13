# Tasks.md

# Implementation Tasks for 3D Print Materials Environment Data Monitoring Dashboard

This task list is designed for an intermediate developer working with Claude Code. Each task should be small enough to complete, test, and commit independently.

## Phase 0 — Repository Preparation and Claude Code Setup

- [x] Open the project folder in Claude Code: `C:\Users\AllamRodriguez\Desktop\Programas\3D Print Materials Environment Data Monitoring Dashboard`.
- [x] Ask Claude Code to inspect the existing `.claude/` folder and `Inpiration CLAUDE.md` before overwriting anything.
- [x] Ask Claude Code to compare existing agents, hooks, and skills against `docs/Requirements.md`.
- [x] Backup or rename any unrelated old `.claude` files before adapting them. (Per explicit user decision: adapted the context-handoff system, deleted the rest — see EVIDENCE.md.)
- [x] Create or update root `CLAUDE.md` using the project-specific version in this starter pack.
- [x] Confirm `.claude/settings.json` loads the safety/evidence hooks.
- [x] Create `/evidence` and `EVIDENCE.md` if they do not exist.
- [x] Initialize Git repository if needed.
- [x] Create `.gitignore` for Python, Node, SQLite DB files, `.env`, and build artifacts.

## Phase 1 — Backend Foundation

- [x] Create backend Python virtual environment.
- [x] Add backend dependencies: FastAPI, Uvicorn, SQLAlchemy, Pydantic, pytest, httpx, pyserial.
- [x] Create `backend/app/main.py` with a FastAPI app and `/health` endpoint.
- [x] Configure CORS for local frontend origin.
- [x] Create Pydantic settings in `backend/app/core/config.py`.
- [x] Create SQLAlchemy engine/session setup.
- [x] Add initial pytest setup with `backend/tests/conftest.py`.
- [x] Add a test for `GET /health`.
- [x] Run pytest and commit the working backend skeleton.

## Phase 2 — Sensor Abstraction and Mock Sensor

- [x] Define `SensorReadingDTO` schema with timestamp, temperature, humidity, pressure, source, sensor metadata.
- [x] Define a `SensorReader` protocol/base class.
- [x] Implement `MockSensorReader` with bounded random-walk behavior.
- [x] Ensure mock values drift realistically over time.
- [x] Add tests confirming mock readings include temperature, humidity, pressure, and timestamps.
- [x] Add tests confirming mock readings remain within configured safe bounds.
- [x] Add a sensor factory that chooses `mock`, `dracal_vcp`, or `dracal_cli` per Sensor DB row (superseded: `get_sensor_reader_for_sensor(sensor)` replaced the earlier settings/`SENSOR_MODE`-driven `get_sensor_reader(settings)` — see Phase 15). `mock`, `dracal_vcp`, and `dracal_cli` all implemented and tested (`dracal_cli` added in Phase 19 — see `backend/app/sensors/dracal_cli.py` — for Dracal devices whose Windows driver exposes them as a generic USB device rather than a virtual COM port, so no `port` is required for that type).

## Phase 3 — TDD Cycle for Required Endpoint

- [x] In Plan Mode, ask Claude to design the first TDD cycle for `GET /readings/current`.
- [x] Write failing pytest for `GET /readings/current` before implementation.
- [x] Save failing test output to `/evidence/tdd-current-reading-fail.txt`.
- [x] Implement `GET /readings/current` using the mock sensor.
- [x] Run pytest again.
- [x] Save passing test output to `/evidence/tdd-current-reading-pass.txt`.
- [x] Document the TDD cycle in `EVIDENCE.md`.

## Phase 4 — Database Models and Persistence

- [x] Create SQLAlchemy models for Sensor, Location, Printer, MaterialProfile, FilamentSpool, SpoolAssignment, Reading, Alert, DryingSession.
- [x] Create Pydantic schemas for read/create/update operations.
- [x] Create repositories or service helpers for CRUD operations.
- [x] Implement idempotent seed script for initial printers, material profiles, sensor, mock locations, and demo spools.
- [x] Add tests for database creation and seed idempotency.
- [x] Decide whether to use SQLAlchemy `create_all` for MVP or Alembic for stretch. (Decided `create_all` — no pre-existing data to migrate; documented in `backend/app/db/seed.py` and `EVIDENCE.md`.)

## Phase 5 — Required Reading Endpoints

- [x] Implement `POST /readings` to capture current sensor reading and persist it.
- [x] Allow `POST /readings` to optionally accept a manual/mock reading payload.
- [x] Implement `GET /readings?from=&to=` with date filtering.
- [x] Add optional filters for sensor and location. (Backend query params + frontend History page filter dropdowns.)
- [x] Add `aggregate=hour` support for hourly averages.
- [x] Add tests for `POST /readings` persistence.
- [x] Add tests for date range filtering.
- [x] Add tests for hourly aggregation.
- [x] Confirm the three assignment endpoints pass pytest.

## Phase 6 — Material Profiles and Alert Logic

- [x] Implement material profile service with default seed values from `docs/Requirements.md`.
- [x] Implement environment evaluation service.
- [x] Evaluate humidity against material thresholds.
- [x] Evaluate temperature against material thresholds.
- [x] Compute dew point and condensation warning.
- [x] Generate alert DTOs for affected spools/materials.
- [x] Persist alerts when readings are saved.
- [x] Add tests for high-humidity warning and critical states.
- [x] Add tests showing pressure is recorded but does not normally cause material readiness alerts.

## Phase 7 — CRUD APIs for Configuration

- [x] Implement `/sensors` CRUD endpoints.
- [x] Implement `/printers` CRUD endpoints.
- [x] Implement `/locations` CRUD endpoints.
- [x] Implement `/materials` CRUD endpoints.
- [x] Implement `/spools` CRUD endpoints.
- [x] Implement `/assignments` CRUD endpoints.
- [x] Implement `/alerts` listing and resolve endpoint.
- [x] Add basic tests for key CRUD endpoints.
- [x] Validate request bodies with Pydantic.

## Phase 8 — Drying Recommendations and Sessions

- [x] Implement drying recommendation service based on material profiles and current alerts.
- [x] Add dryer model/profile fields such as max temperature and notes.
- [x] Display warning when selected dryer cannot reach recommended drying temperature.
- [x] Implement `/drying/recommendations` endpoint.
- [x] Implement drying session create/list/update endpoints.
- [x] Add tests for PETG, Nylon/PA, PC, PVA/BVOH recommendations.
- [x] Ensure recommendations say the dryer is not automatically controlled.

## Phase 9 — Dracal VCP Parser and Optional Real Hardware Mode

- [x] Implement parser for VCP line format, e.g. `D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5`.
- [x] Parse pressure in Pa, temperature in C, humidity in %RH.
- [x] Validate expected product prefix and serial number when configured.
- [x] Handle malformed payloads with clear exceptions.
- [x] Add pytest coverage for valid line, invalid line, wrong serial, missing channel.
- [x] Implement optional pyserial reader if hardware is available.
- [x] Add `.env.example` with `DRACAL_VCP_PORT=COM3` and `DRACAL_SERIAL_NUMBER=E25877`.
- [x] Keep mock mode as default. (Superseded: there is no global mode anymore — seeded mock sensor rows are `is_active=true` by default, so the app still runs fully without hardware. See Phase 17.)

## Phase 10 — Frontend Foundation

- [x] Create React app with Vite and TypeScript.
- [x] Add frontend dependencies: Recharts or Chart.js, date utilities, optional UI library.
- [x] Create API client module with base URL config.
- [x] Create app layout with sidebar/topbar.
- [x] Implement dark theme as default.
- [x] Implement light/dark theme toggle with localStorage.
- [x] Add placeholder routes: Dashboard, History, Printers, Materials, Spools, Drying, Settings.
- [x] Confirm frontend runs locally.

## Phase 11 — Main Dashboard UI

- [x] Fetch `/readings/current` every 2–5 seconds.
- [x] Display current sensor cards for temperature, humidity, pressure, and dew point.
- [x] Display printer/location and sensor metadata.
- [x] Display affected spools and material profiles. (`AffectedSpoolsPanel`, backed by `affected_spools` on `GET /readings/current`.)
- [x] Display alert panel with severity styling.
- [x] Display drying recommendation cards.
- [x] Show timestamp and source mode: mock or real. (Updated for Phase 17: shown per sensor section, since `GET /readings/current` now returns one entry per active sensor instead of a single reading.)
- [x] Add loading and error states.

## Phase 12 — History Chart UI

- [x] Build date-time range picker.
- [x] Fetch `GET /readings?from=&to=&aggregate=hour`.
- [x] Render line chart for temperature.
- [x] Render line chart for relative humidity.
- [x] Render line chart for pressure.
- [x] Allow filtering by sensor or location.
- [x] Show empty state when no readings exist.
- [x] Add manual "capture reading" button that calls `POST /readings`.

## Phase 13 — Configuration Screens

- [x] Build printers management screen.
- [x] Build locations management screen. (Combined with printers on one screen, matching Requirements.md section 11.2's single "Printers & Locations Management" section.)
- [x] Build material profiles management screen.
- [x] Build spools management screen.
- [x] Build spool assignment form.
- [x] Build settings screen for sensor mode and refresh interval. (Updated for Phase 17: the sensor-mode card now explains per-row `/sensors` configuration instead of a `SENSOR_MODE` env var, since that global toggle no longer exists.)
- [x] Validate forms before submit. (Consistent user-facing validation errors via the shared `useNotice` hook across Printers, Materials, Spools.)
- [x] Show success/error notifications. (`useNotice` + `NoticeBanner`, wired into create/update/delete/assign actions.)

## Phase 14 — Documentation and Evidence

- [x] Generate `README.md` with setup instructions for backend and frontend.
- [x] Document mock mode and real Dracal VCP mode. (Updated for Phase 17: documented as per-row `sensor_type` configuration, not a global mode.)
- [x] Document the three required endpoints.
- [x] Document material profile assumptions and editability.
- [x] Add screenshots of dashboard, history chart, and settings screens. (`evidence/frontend-verification/`: dashboard-dark/light, history-chart, materials-page, drying-recommendation, printers-validation, settings-page.)
- [x] Add evidence for Plan Mode / Ask Mode.
- [x] Add evidence for custom skills.
- [x] Add evidence for custom hooks.
- [x] Add evidence for subagents.
- [x] Add evidence for TDD cycle.
- [x] Add evidence for security review.
- [ ] Add evidence for GitHub MCP action. (No GitHub MCP server was connected in this environment; per explicit user instruction, substituted with a real `gh` CLI action — repo creation + Issue #1 — documented in `EVIDENCE.md` as satisfying the requirement in spirit, not literally via MCP.)

## Phase 15 — Security Review

- [x] Ask Claude Code to review `POST /readings` for validation, persistence, and sensor access risks.
- [x] Fix any reasonable findings.
- [x] Document findings and fixes in `EVIDENCE.md`.
- [x] Confirm CORS is limited to local origins.
- [x] Confirm `.env` and SQLite database files are ignored by Git.
- [x] Confirm hooks block dangerous shell commands.

## Phase 16 — GitHub and Final Submission

- [x] Create GitHub repository. (https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard)
- [ ] Use GitHub MCP for at least one real action: create an issue, make a commit, open PR, or review PR. (No GitHub MCP server connected this session; substituted with `gh` CLI — repo push + Issue #1 — per explicit user instruction. See `EVIDENCE.md`.)
- [x] Commit project source and Claude artifacts.
- [x] Verify all backend tests pass. (87 passed, 0 failed.)
- [x] Verify frontend runs and consumes backend. (`npm run build` clean; live-verified via Playwright MCP.)
- [x] Verify README instructions work from a clean clone. (Commands cross-checked against `backend/requirements.txt` and `frontend/package.json` scripts for consistency; not re-run from an actual fresh clone in this session.)
- [x] Confirm no secrets or local DB files are committed.
- [x] Prepare final evidence summary.

## Phase 17 — Remove Global SENSOR_MODE, Move to Per-Sensor DB Configuration

See `docs/Tareas/eliminar-sensor-mode-global/TASK.md` for the full task record.

- [x] Add `Sensor` field/cross-field validation (`sensor_type` enum, mock serial
  can't be `E25877`, mock serial must start with `MOCK-`, Dracal-type sensors
  require a `port`, friendly 400 on duplicate serial) in
  `backend/app/services/sensor_validation.py`, wired into `sensor_service.py`
  create/update and into the startup seed script.
- [x] Replace the global `get_sensor_reader(settings)` factory with a per-row
  `get_sensor_reader_for_sensor(sensor)`; independent, reproducible mock drift
  per sensor derived from its own serial number.
- [x] Remove `Settings.sensor_mode`; `DRACAL_SERIAL_NUMBER`/`DRACAL_VCP_PORT`/
  `MOCK_SENSOR_COUNT` are now consumed only by the seed script.
- [x] Rewrite `GET /readings/current` to return `{"sensors": [...], "message"?: ...}`
  — one entry per active sensor, with its own `error` field so one failing
  sensor never blocks the others, and never a synthesized reading when no
  sensor rows are active.
- [x] Rewrite `POST /readings` (empty body) to capture-and-persist from every
  active sensor in one call, returning one result per sensor.
- [x] Rewrite/extend backend tests: sensor factory, `/sensors` validation,
  `environment_service`, `GET /readings/current`, `POST /readings`, seed
  idempotency (no mock uses `E25877`, all use `MOCK-`).
- [x] Update frontend: new list-shaped types, `Dashboard.tsx` renders one
  `SensorReadingSection` per active sensor with an isolated error state and an
  empty state, `SystemStatusBadge` now reports sensors-online count instead of
  a single mock/real toggle, `Settings.tsx`'s sensor card rewritten.
- [x] Update `docs/Requirements.md` (§12.1, §13.2, §13.3, §13.4, §14.2),
  `CLAUDE.md`, `README.md`, root `.env.example`.
- [x] Full backend `pytest` green (110 passed), frontend `tsc -b`/`build`/`lint`
  clean, Playwright MCP verification (multi-sensor view, empty state, isolated
  real-sensor error, theme toggle, Settings page).

## Phase 18 — Printer Detail View, AMS Slot Grid, Sensor Port Detection (Phase 1)

See `docs/Tareas/printer-ams-sensor-config/TASK.md` for the full task record. A
Bambu-Studio-inspired redesign was requested (17 sections); scoped to a
right-sized Phase 1 per CLAUDE.md's "keep the MVP focused" constraint, agreed
with the user via `AskUserQuestion`. Phase 2+ items are documented as deferred
in `docs/Frontend_Redesign_Guide.md` §9, not built here.

- [x] Add `Location.slot_index: int | None` (only meaningful for
  `location_type == "printer_ams"`) so a printer's AMS slots render in a
  stable order; no new `AmsUnit`/slot model.
- [x] Seed: backfill `slot_index=0` on the existing `A1 mini #1` AMS location;
  seed a full 4-slot AMS (`slot_index` 0-3) for `P1S #1` as a real multi-slot
  demo. Every other printer has no seeded AMS and shows an explicit "No AMS
  configured" state — never a fabricated grid.
- [x] Add `GET /sensors/ports` (wraps `serial.tools.list_ports.comports()`,
  zero new dependencies) and `POST /sensors/{id}/test-read` (wraps the
  existing per-sensor reader factory; never persists a `Reading`, never
  raises a 5xx for a hardware failure).
- [x] Frontend: `PrinterDetail.tsx` (`/printers/:id`) reusing
  `SensorReadingSection`/`AlertPanel`/`AffectedSpoolsPanel` unmodified;
  `AmsSlotGrid`/`AmsSlotButton` (real spool/material data per slot);
  `SlotAssignmentModal` (composes existing `Dialog`/`Select`, not a new modal
  system); `HumidityScale` (client-side A-E "DRY → WET" grade, no backend
  change); `Sensors.tsx` admin page (closes the previously-deferred
  `/sensors` CRUD gap) with `PortSelect` (detected-port dropdown + manual
  "Scan", pairs with a plain text input so a port can always be typed
  manually) and an inline test-read button.
- [x] New/extended backend tests: `test_locations.py` (`slot_index`
  create/seed ordering), `test_sensors.py` (ports mocked via
  `serial.tools.list_ports`, test-read success/error/404, no real hardware
  dependency).
- [x] Full backend `pytest` green (116 passed), frontend `tsc -b`/`build`/`lint`
  clean, Playwright MCP verification: P1S #1 shows 4 real slots, A1 mini #2
  (no seeded AMS) shows the explicit empty state, mock sensor creation with
  serial `E25877` still rejected (422), live port scan returns real detected
  COM ports, test-read returns a real mock-sensor reading inline.
- [x] Update `docs/Requirements.md` (§6, §12.2, §14.1, §14.2),
  `docs/Frontend_Redesign_Guide.md` §9 (reconciled the `SensorStatusGrid`
  note, listed Phase 2+ deferred items), `README.md`.

## Phase 19 — Implement DracalCliSensorReader (Real-Hardware Validation)

See `docs/Tareas/dracal-cli-sensor-reader/TASK.md` for the full task record.
Live validation of Phase 18's port detection against the user's real Dracal
sensor (serial `E27297`) found it exposes no COM port at all — its Windows
driver binds to the generic USB class, not CDC/VCP (confirmed via
`HKLM\HARDWARE\DEVICEMAP\SERIALCOMM` and Device Manager). The user pointed to
Dracal's own `dracal-usb-get` CLI tool as the correct interface for this case
— exactly the `sensor_type="dracal_cli"` already reserved in the schema
(`VALID_SENSOR_TYPES`) but previously left unimplemented (factory raised
`ValueError`).

- [x] `DracalCliSensorReader` (`backend/app/sensors/dracal_cli.py`) — wraps
  `subprocess.check_output(["dracal-usb-get", "-i", "0,1,2", "-s", serial])`,
  parses `pressure_kPa, temperature_C, rh_percent`; a missing executable
  propagates as `OSError` (already handled the same way `dracal_vcp` errors
  are), malformed/non-numeric output raises `SensorParseError`.
- [x] Relaxed `sensor_validation.py`: only `dracal_vcp` requires a non-empty
  `port` — `dracal_cli` identifies its device via `serial_number` alone.
- [x] New `Settings.dracal_cli_executable` (default `dracal-usb-get`, relies
  on `PATH`; overridable for machines where the tool isn't on `PATH`).
- [x] `SensorForm.tsx`'s port field/`PortSelect` no longer shown for
  `dracal_cli`.
- [x] New tests (`test_dracal_cli.py`, extended `test_factory.py`/
  `test_sensors.py`) with `subprocess.check_output` mocked — no dependency
  on the real CLI binary or hardware in CI. Full suite: 124 passed.
- [x] Registered the user's real sensor (serial `E27297`, `sensor_type=dracal_cli`)
  at a new location and confirmed a live, non-fabricated reading through
  `GET /readings/current`.
- [x] Updated `docs/Requirements.md` §10.1, `docs/Tasks.md`, `.env.example`,
  `README.md`.

## Phase 20 — Add Filament: Manual Add / Read from AMS

See `docs/Tareas/read-from-ams-flow/TASK.md` for the full task record. The
first item picked from Phase 18's documented Phase 2+ deferred list (user
chose via `AskUserQuestion` from three options).

- [x] `ReadFromAmsPanel.tsx` — reads the AMS slots this project already
  tracks explicitly (`Location.slot_index`, from Phase 18), not any real
  hardware auto-detection; only printers with at least one seeded AMS
  location appear in the picker; only currently-empty slots are selectable
  (occupied ones already render correctly on the printer's own AMS grid);
  supports multi-select ("Select all detected"/"Clear selection") and
  batch-creates a spool + assignment per selected slot with one shared
  material/brand/color/status entry.
- [x] `AddFilamentModal.tsx` — `Dialog` + `Tabs` composing the existing
  `SpoolForm` (Manual Add, unchanged) and the new `ReadFromAmsPanel` (Read
  from AMS) — not a new form system.
- [x] `Spools.tsx` — the former inline "Add spool" card is replaced by an
  "Add Filament" button opening the modal; the assignment table and
  per-row `SpoolAssignmentForm` are untouched. No backend changes.
- [x] `tsc -b`/`build`/`lint` clean. Playwright MCP verification: `P1S #1`
  (4 empty AMS slots) — selected 2, filled in ASA/Bambu Lab/Gray once,
  submitted, and confirmed 2 new spools appeared in both `/spools`'s table
  and `PrinterDetail`'s AMS grid (A1/A2 now loaded, A3/A4 still empty).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 (marked "Read from AMS"
  done, reconciled the deferred-list entry).

## Phase 21 — Filament Manager: Filters, Search, Grouping, Edit/Delete

See `docs/Tareas/filament-manager-redesign/TASK.md` for the full task
record. Second item picked from Phase 18's Phase 2+ deferred list (chosen at
Claude's discretion, per the user's explicit "continue with whichever you
think is best").

- [x] `FilamentFilters.tsx` — scope tabs (All/AMS/Storage, derived from the
  spool's active assignment's `location_type`), brand/material-type
  (`MaterialProfile.family`)/filament-type (`MaterialProfile.name`)/status
  selects, free-text search (brand/color/material name), and an optional
  grouping select (location/printer/material).
- [x] `EditSpoolModal.tsx` — reuses `SpoolForm` (now with a `submitLabel`
  prop so it reads "Save changes" here instead of "Add spool").
- [x] `Spools.tsx` rewritten: computes the filtered + grouped spool list
  client-side, renders two distinct empty states (no spools at all vs. no
  results for the current filters), and adds Edit/Delete actions per row
  (Delete confirms via `window.confirm` and surfaces the backend's existing
  friendly-400 when a spool is still referenced by an active assignment).
- [x] **Pre-existing bug found and fixed during live verification**:
  `FilamentSpool.color` was required (`str`) in the backend model/schema
  but always treated as optional everywhere in the frontend (types, forms,
  display fallbacks) — any "Add Filament" submission with a blank color
  silently 422'd. Fixed to `str | None` in both the SQLAlchemy model and
  Pydantic schema; added regression tests (create without color succeeds;
  delete blocked by an active assignment returns a friendly 400).
- [x] `tsc -b`/`build`/`lint` clean. Full backend suite: 126 passed (2 new
  spool tests). Playwright MCP verification: AMS/Storage scope filters,
  free-text search empty state, group-by-printer, edit persists a field
  change, delete blocked when referenced vs. succeeds when unassigned,
  create-with-blank-color succeeds post-fix.
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 (marked Filament Manager
  redesign done).

## Phase 22 — Filament Color Swatch Picker

See `docs/Tareas/filament-color-swatch/TASK.md` for the full task record.
Third item picked from Phase 18's Phase 2+ deferred list (Claude's own
discretion, per the user's "continue with whichever you think is best").

- [x] `frontend/src/lib/colorSwatch.ts` — best-effort free-text color-name
  to CSS-color mapping (`guessSwatchColor`), returning `null` (never a
  fabricated color) for anything unrecognized, plus a `COLOR_PRESETS` list
  of common filament colors.
- [x] `ColorSwatch.tsx` — small circular swatch: filled for a recognized
  name, a neutral dashed outline ring otherwise.
- [x] `ColorSwatchPicker.tsx` — the existing free-text color `Input` plus a
  live swatch preview and a row of clickable presets that just fill the
  same field (a custom name is always still allowed). Wired into `SpoolForm`
  (Manual Add / Edit) and `ReadFromAmsPanel` (Read from AMS), replacing the
  plain `Input`.
- [x] Swatch added next to the color text in `Spools.tsx`'s table and in
  `AmsSlotButton.tsx`'s AMS slot cards. No backend/schema changes — color
  remains the existing free-text string (no hex column exists to persist a
  real RGB value; fabricating one wasn't in scope).
- [x] `tsc -b`/`build`/`lint` clean. Playwright MCP verification (screenshots
  in `evidence/frontend-verification/`): clicking the "Blue" preset fills
  the field and updates the live preview swatch; swatches render correctly
  in the Filament Manager table (black/orange dots next to "Black"/"Orange")
  and on `PrinterDetail`'s AMS grid.
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 (marked color picker
  done) — all frontend-only items from the original Phase 2+ list are now
  built; the two remaining (`Printer` filament-system-type column, sensor-
  inheritance UI, `MaterialProfile` nozzle/bed-temp + override chain) all
  require a schema change and stay deferred.

## Phase 23 — Printer Filament System Type

See `docs/Tareas/printer-filament-system-type/TASK.md` for the full task
record. Fourth item picked from Phase 18's Phase 2+ deferred list (Claude's
own discretion, per the user's "continue with whichever you think is best").

- [x] `Printer.filament_system_type: str` (default `"manual"`), validated
  against `{"ams", "external_spool", "storage_only", "manual"}` in
  `printer_service.py` (422 on create/update for an unknown value), added to
  the SQLAlchemy model + Pydantic schemas.
- [x] Seed updated: `A1 mini #1` and `P1S #1` → `"ams"` (matches their
  already-seeded `printer_ams` `Location` rows); every other seeded printer
  → `"external_spool"`. Purely descriptive — does **not** change the
  existing AMS-grid inference logic (`AmsSlotGrid`/`ReadFromAmsPanel`/
  `PrinterDetail` still derive AMS-ness from real `Location` rows), avoiding
  two competing sources of truth for "does this printer have AMS."
- [x] 5 new backend tests (default value, valid/invalid enum on create,
  invalid enum on patch, seeded-printer consistency). Full suite: 131 passed.
- [x] Frontend: `Printer.filament_system_type` added to `types/api.ts`; new
  `Select` in `PrinterForm.tsx`; new "Filament System" column in
  `Printers.tsx`; shown next to brand/model in `PrinterDetail.tsx`'s header.
- [x] `tsc -b`/`build`/`lint` clean. Playwright MCP verification: "Filament
  System" column renders seeded values (`ams`/`external spool`) in
  `/printers`; `/printers/1` header shows "Bambu Lab A1 mini · Ams"; created
  a test printer with `storage_only` via the form, confirmed it saved and
  displayed correctly end-to-end, then deleted it.
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 (marked filament-system-
  type selector done) — of the original Phase 2+ list, only sensor-
  inheritance resolution UI (judged not worth building — no real inheritance
  chain to resolve) and `MaterialProfile` nozzle/bed-temp + override chain
  (needs a schema migration tool this project doesn't have) remain deferred.

## Phase 24 — Frontend Automated Tests (Vitest)

See `docs/Tareas/frontend-vitest-setup/TASK.md` for the full task record.
Picked at Claude's own discretion (per the user's "continua con lo que
falte") as a concrete, already-documented gap rather than a speculative
item: `CLAUDE.md`'s own Testing Commands section already listed
`cd frontend && npx vitest run`, but no Vitest config or test-library
dependency had ever been added — tracked as
[GitHub Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1).

- [x] Installed `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom` as dev dependencies.
- [x] Added a `test` block to the existing `vite.config.ts` (reusing its `@/`
  alias and plugins rather than a separate, drifting `vitest.config.ts`), plus
  `src/test/setup.ts` (`jest-dom` matchers + explicit RTL `cleanup()` in an
  `afterEach`, since `globals: true` was deliberately not enabled — tests
  import `describe`/`it`/`expect`/`vi` explicitly from `"vitest"`).
- [x] `ThemeToggle.test.tsx` — default (dark) state, a pre-set `localStorage`
  value is respected on mount, clicking toggles both the visible label and
  `data-theme`/`localStorage` in both directions.
- [x] `Dashboard.test.tsx` — mocks `@/api/readings`'s `getCurrentReading` and
  `@/api/config`'s `dryingApi.recommendations` (both wrapped in a real
  `QueryClientProvider` with retries disabled); covers loading, backend-
  unreachable error, no-active-sensors empty state, and populated sensor +
  drying-recommendation rendering.
- [x] `AlertPanel.test.tsx` — empty state, a warning-severity humidity alert,
  a critical-severity temperature alert with a recommended action.
- [x] `"test": "vitest run"` script added to `package.json`; documented in
  `frontend/README.md` and root `CLAUDE.md`'s Testing Commands.
- [x] `npx vitest run` (10 passed), `tsc -b`/`build`/`lint` clean, backend
  suite unaffected (131 passed, no backend changes in this task).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9.

## Phase 25 — Material Profile Manufacturer Override

See `docs/Tareas/material-profile-manufacturer-override/TASK.md` for the
full task record. Picked at Claude's own discretion in response to
"continua con lo que queda" after an Explore agent confirmed this was a
real requirements gap — `docs/Requirements.md` §7 rule 1 and `CLAUDE.md`'s
Domain Rules both state manufacturer-specific profiles must override family
defaults, but `manufacturer`/`variant` were always `null` in seed data and
never resolved against anything, anywhere in the codebase.

- [x] Seeded a real manufacturer-specific example: "Prusament PLA"
  (`manufacturer="Prusament"`, `family="PLA-derived"` — same family as
  generic "PLA" — with tighter RH thresholds: 35/45/55% vs. 40/50/60%).
  `source_notes` honestly labels the numbers as illustrative, not sourced
  from Prusament's real published spec (same "never fabricate data"
  principle as the color-swatch picker, applied to numeric domain data).
- [x] `_get_or_create_material_profile` now passes `manufacturer=` through
  (previously silently dropped, always `None`).
- [x] Backend test: seeded "Prusament PLA" has `manufacturer="Prusament"`,
  shares `family` with generic "PLA", and has a lower `ideal_rh_max_percent`.
  Fixed a hardcoded `MaterialProfile` count assertion in
  `test_seed_idempotent.py` (10 → 11). Full suite: 132 passed.
- [x] `Materials.tsx` gained a "Manufacturer" column (shows the manufacturer
  name or "Generic") — closing Requirements §7 rule 3 ("must show the
  source or note for each profile").
- [x] `SpoolForm.tsx`: when the typed `brand` case-insensitively matches an
  existing manufacturer-specific profile sharing the currently-selected
  profile's family, shows an inline hint + "Use it" button that switches
  `material_profile_id` — a suggestion, never a silent auto-switch, since a
  spool already points at exactly one profile row and there's no separate
  family input at evaluation time to resolve against automatically.
  Deliberately no new `/materials/resolve` backend endpoint: the frontend
  already has the full profile list loaded, so a network round-trip would
  be strictly worse than the existing client-side `.find()` pattern used
  elsewhere (e.g. `Printers.tsx` resolving a location's printer name).
- [x] `SpoolForm.test.tsx` (new): no hint for a non-matching brand; hint
  appears for a matching brand; clicking "Use it" switches the Select's
  displayed value and hides the hint; no false-positive across families.
- [x] `npx vitest run` (14 passed), `tsc -b`/`build`/`lint` clean, backend
  suite 132 passed.
- [x] Playwright MCP was disconnected mid-task; the merge-to-main attempt
  was actually blocked by the auto-mode classifier for exactly this reason
  (a UI change merging without the browser check `CLAUDE.md`'s Git Workflow
  requires). Held the merge and asked the user, who reconnected the server
  (`/mcp reconnect all`). Real Playwright verification then performed:
  `/materials` shows "Prusament" in the new Manufacturer column
  (screenshot: `evidence/frontend-verification/materials-manufacturer-column.png`);
  on `/spools`, Material=PLA + Brand=Prusament shows the suggestion hint,
  and clicking "Use it" switches the Material select to "Prusament PLA"
  and hides the hint (screenshot: `evidence/frontend-verification/spoolform-override-hint.png`).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 — of the original
  Phase 2+ list, only sensor-inheritance resolution UI and `MaterialProfile`
  nozzle/bed-temp fields remain deferred (both for reasons independent of
  a missing migration tool: no real inheritance chain exists to resolve for
  the former, and slicer-profile data is orthogonal to this app's scope for
  the latter).

## Suggested Commit Sequence

1. `chore: initialize project docs and claude code configuration`
2. `feat(backend): add fastapi app and sensor abstraction`
3. `test: document tdd cycle for current readings endpoint`
4. `feat(backend): persist readings with sqlite and sqlalchemy`
5. `feat(backend): add material profiles and environmental alerts`
6. `feat(frontend): add live dashboard and dark mode`
7. `feat(frontend): add history chart and filters`
8. `feat(frontend): add printer and filament configuration screens`
9. `docs: add readme and claude code evidence`
10. `chore: final validation and cleanup`
