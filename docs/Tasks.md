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

## Phase 26 — Alerts History Admin Page

See `docs/Tareas/alerts-history-admin-page/TASK.md` for the full task
record. Picked at Claude's own discretion in response to "Continua con lo
restante" — an Explore agent audited `docs/Requirements.md` end-to-end for
gaps beyond the two already-known deferred items, and found this one:
§12.2 requires `GET /alerts` and `PATCH /alerts/{id}/resolve`, fully
implemented and tested on the backend, but the frontend had zero consumer
for it — the same class of gap as the manufacturer-override chain fixed in
Phase 25 (documented, endpoint-backed rule, no consuming code). A second,
lower-priority gap was also found (§11.6: no drying-session trend chart) —
noted in `docs/Frontend_Redesign_Guide.md`, deferred, not built this round.

- [x] `types/api.ts`: `AlertResolveResponse { alert: AlertOut }` (reusing
  the existing `AlertOut` type, which already matched the backend's
  `AlertRead` schema exactly).
- [x] `api/config.ts`: `alertsApi.list(params?)` (`is_active`/`severity`/
  `location_id` query params) and `alertsApi.resolve(id)` (empty-body PATCH
  — the backend endpoint declares no request body).
- [x] `hooks/resources/alerts.ts` (new): `useAlerts(params?)` and
  `useResolveAlert()` — plain `useQuery`/`useMutation`, not
  `createResourceHooks`, since this resource is list+resolve only.
- [x] `Alerts.tsx` (new page): status filter (All/Active/Resolved),
  severity filter (All/info/warning/critical), a table (severity badge,
  metric, message, recommended action, location — resolved via
  `useLocations()` + `.find()`, created-at, status badge, Resolve button
  for active rows only). Route `/alerts` + nav item (`Bell` icon) added.
  `AlertPanel.tsx` (Dashboard's per-sensor embedded alerts) left unchanged
  — different job (live status vs. history/acknowledgment).
- [x] `Alerts.test.tsx` (new, 4 tests): empty state; rendering an active
  alert with severity/location/Resolve button; resolving calls the mutation
  and the row updates to "Resolved" with the button gone; an
  already-resolved alert never shows a Resolve button.
- [x] `npx vitest run` (18 passed), `tsc -b`/`build`/`lint` clean, backend
  suite 132 passed (no backend changes — this task is frontend-only).
- [x] Playwright verification: triggered a critical humidity alert (and a
  bonus warning dew-point alert) via `POST /readings` against the seeded
  PLA spool's location; `/alerts` rendered both with correct badges and
  resolved location name (screenshot:
  `evidence/frontend-verification/alerts-page-active.png`); clicking
  "Resolve" on the humidity alert switched it to a green "Resolved" badge
  with the button gone, while the dew-point alert stayed Active (screenshot:
  `evidence/frontend-verification/alerts-page-resolved.png`).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9.

## Phase 27 — Drying Session Trend Chart

See `docs/Tareas/drying-session-trend-chart/TASK.md` for the full task
record. Picked at Claude's own discretion in response to "Haz todo lo que
consideres necesario y escencial de todo lo que falta" — the last remaining
item from the Requirements.md audit that ranked as a genuine, scoped gap:
§11.6 asks the app to let a user "review measured trend" while validating a
drying session, but `/drying` only ever showed a static sessions table with
target numbers and a notes box, no chart. The two other previously-noted
deferred items (sensor-inheritance UI, `MaterialProfile` nozzle/bed-temp
fields) were intentionally NOT built — both were already judged not to be
real gaps, so "necessary and essential" did not include them.

- [x] `useDryingSessionTrend(session)` hook (`hooks/resources/drying.ts`) —
  reuses the existing `getReadingsHistory()`/`GET /readings?aggregate=hour`
  (no new backend endpoint) over the session's own `started_at`..
  `ended_at ?? now` window, filtered to its `sensor_id`; `enabled` only when
  a session with a non-null sensor is given.
- [x] `DryingSessionTrendDialog.tsx` (new): loading / empty ("no readings
  recorded in this session's time window yet") / populated states, reusing
  the existing `HistoryChart` component (already built for `/history`) for
  Relative Humidity and Temperature only — pressure omitted, since Domain
  Rules make humidity the primary readiness metric and pressure secondary,
  so a focused drying-validation view doesn't need it.
- [x] `DryingSessionsTable.tsx`: new `trendSession` state + a "View trend"
  button per row (shown whenever `session.sensor_id !== null`), following
  the exact same `useState<DryingSessionRead | null>` + second `<Dialog>`
  pattern the table already used for its status-transition action — no
  restructuring of the table.
- [x] `DryingSessionTrendDialog.test.tsx` (new, 4 tests): closed when no
  session given; empty state; both charts render when readings exist;
  confirms the exact `getReadingsHistory` call args (session's own
  `started_at`/`ended_at`/`sensor_id`, `aggregate: "hour"`).
- [x] `npx vitest run` (22 passed), `tsc -b`/`build`/`lint` clean, backend
  suite 132 passed (no backend changes — this task is frontend-only).
- [x] Playwright verification: created a real drying session (spool #2 →
  Dry Box 1, "Mock Sensor 3"), triggered an automatic sensor capture to
  produce a real reading at that location, clicked "View trend" on
  `/drying` and confirmed both charts rendered the real data point
  (screenshot: `evidence/frontend-verification/drying-session-trend-dialog.png`).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9 — this was the last
  confirmed real gap from the Requirements.md audit; only the two
  already-judged-out-of-scope items remain on the deferred list.

## Phase 28 — Sensor Per AMS Module

See `docs/Tareas/sensor-per-ams-module/TASK.md` for the full task record.
Raised by the user directly (not from the Requirements.md audit) while
asking what "sensor-inheritance resolution UI" (a previously-deferred item)
would consist of — that explanation surfaced a distinct, real data-model
gap: a physical AMS module has exactly one shared sensor covering the
microclimate of all its slots, but `Sensor.location_id` could point at a
single AMS-slot `Location`, and alert/affected-spool evaluation only
matched that exact `location_id`, never expanding to sibling slots. Planned
via Plan Mode with two parallel Explore agents (backend sensor/location
coupling; frontend AMS display components) before implementation.

- [x] `alert_service.get_affected_spools(session, location_id)`: resolves
  the `Location`, and if `printer_id is not None` expands to every sibling
  sharing `(printer_id, location_type)` — generalized, not hardcoded to
  `"printer_ams"`, so any future per-printer multi-row location type is
  covered for free. This one function backs all 3 alert/reading flows
  (`GET /readings/current`, `POST /readings` auto-capture and manual), so
  the fix applies everywhere in one place.
- [x] `sensor_service.py`: new `_check_ams_sensor_conflict` (same 400
  pattern as the existing `_check_duplicate_serial`) rejects assigning a
  second sensor to any sibling slot of an AMS module that already has one,
  called from `create_sensor` always and `update_sensor` only when
  `"location_id"` is in the payload (`exclude_id` lets a sensor move
  between slots of its own AMS without self-conflicting).
- [x] `seed.py`: added `Mock Sensor 4` (`MOCK-0004`) to P1S #1's AMS slot 1
  and a demo spool to a *different* slot (A3) of the same AMS — previously
  no seeded AMS module demonstrated the shared-sensor behavior at all
  (A1 mini #1's AMS only had 1 slot seeded; P1S #1's 4-slot AMS had zero
  sensors).
- [x] Backend tests: sibling expansion (2 spools in 2 different slots of
  one printer, both surfaced by one sensor's reading), non-printer
  locations unaffected (regression), sensor-conflict validation (create +
  update reject, same-AMS reassignment via `exclude_id` allowed, non-AMS
  locations unrestricted). Full suite: 138 passed (132 + 6 new).
- [x] `frontend/src/lib/sensorLocation.ts` (new): `describeSensorLocation()`
  relabels an AMS-slot location by its printer ("P1S #1 — AMS") instead of
  the misleading exact slot name; plain name for everything else.
- [x] `SensorReadingSection.tsx` (new optional `printers?` prop),
  `Dashboard.tsx` (added `usePrinters()`), `PrinterDetail.tsx` (passed its
  already-fetched `printers`), `Sensors.tsx` admin table — all now use the
  helper for the location label.
- [x] `SensorForm.tsx`: new `printers` prop; the location picker collapses
  an AMS module's slots to one option (lowest `slot_index` as the
  representative `location_id`) instead of listing all 4 as if independent.
- [x] Discovered and fixed a jsdom gap while writing `SensorForm.test.tsx`:
  Radix `<Select>` needs `hasPointerCapture`/`scrollIntoView`, which jsdom
  doesn't implement — added the standard polyfill to `src/test/setup.ts`
  (benefits any future test opening a Select's dropdown).
- [x] `npx vitest run` (31 passed, 9 files), `tsc -b`/`build`/`lint` clean.
- [x] Playwright verification (after deleting the dev DB, since the seed's
  spool-seeding block is gated on the spools table being empty and this DB
  already had spools from prior sessions): `/printers/5` shows "MOCK-0004"
  labeled "P1S #1 — AMS" and correctly lists the PLA/Silver spool from a
  *different* slot as affected (screenshot:
  `evidence/frontend-verification/printer-detail-shared-ams-sensor.png`);
  on `/sensors`, the location picker showed one "P1S #1 — AMS" option, and
  creating a second sensor on that AMS module correctly failed with a 400
  (confirmed via the browser's network console log; screenshot:
  `evidence/frontend-verification/sensors-ams-conflict-error.png`).
- [x] Updated `docs/Frontend_Redesign_Guide.md` §9.

## Phase 29 — Dashboard Device-Module Visual Redesign

See `docs/Tareas/dashboard-device-redesign/TASK.md` and `docs/Dashboard_Device_Redesign_Guide.md`
for the full task record and architecture writeup. The user reviewed the earlier
Bambu-Studio-inspired redesign (Phase 18) and found the Dashboard itself still "too simple, not
representative, no strong visual identity" against the reference images. Planned via Plan Mode
with 3 parallel Explore agents (current Dashboard structure; existing AMS/slot/printer components
already built for `/printers/:id`; data model relations and CLAUDE.md/Requirements.md constraints)
plus 1 Plan agent to firm up concrete component contracts before implementation.

Key finding: almost everything needed already existed on `/printers/:id`
(`AmsSlotGrid`/`AmsSlotButton`/`SlotAssignmentModal`/`HumidityScale`/`ColorSwatch`/`StatusBadge`) —
this task ports that pattern to the Dashboard, grouped by printer/location instead of by raw
sensor, rather than building a new visual system from scratch.

- [x] `lib/deviceModules.ts` (new): `buildDeviceModules(printers, locations, sensorEntries)` groups
  into printer modules (always rendered, even with zero sensors/locations — a real, unconfigured
  printer isn't fabricated data), standalone location modules (non-printer, sensor-bearing
  room/storage_box/dry_box/dryer), and an orphan-sensor fallback bucket. `toneForMetric(alerts,
  metric)` — tile tone from active alerts targeting that exact metric.
- [x] `lib/deviceType.ts` (new): `filamentSystemVisual()`/`locationTypeVisual()` — icon+label+class
  per `filament_system_type`/`location_type`, deliberately neutral-colored (never `StatusBadge`'s
  ok/warning/critical palette), sibling to `lib/status.ts`, not an extension of it.
- [x] `DeviceTypeIcon.tsx`, `EnvMetricTile.tsx` (denser `ReadingCard` sibling, same prop shape),
  `ExternalSpoolSlot.tsx` (the "Ext" slot, mirroring `AmsSlotButton`'s visual language) — new
  presentational pieces.
- [x] `DeviceModuleCard.tsx` (new): one printer's device module — header (type badge, status dot,
  name/brand/model), sensor serial+type+timestamp, `EnvMetricTile` row, `HumidityScale`,
  `AmsSlotGrid`/`ExternalSpoolSlot`(s) or an explicit "no slots configured" line, `AlertPanel`,
  `AffectedSpoolsPanel` — composing existing components unmodified. A colored top accent bar
  (`bg-ok`/`bg-warning`/`bg-destructive`/`bg-border`) reflects the module's worst active condition,
  built entirely from existing design tokens, no new colors.
- [x] `StandaloneLocationCard.tsx` (new): same shell for non-printer sensor-bearing locations,
  minus the filament-slot section.
- [x] `DeviceModuleGrid.tsx` (new): owns the single shared `SlotAssignmentModal` + assign/clear
  handlers (identical shape to `PrinterDetail.tsx`'s own state — not duplicated per module), renders
  the responsive printer/standalone grids plus a flat fallback for orphan sensor entries.
- [x] `Dashboard.tsx` rewritten: adds `useLocations`/`useSpools`/`useMaterials`/`useAssignments`
  alongside the existing `usePrinters()`, delegates the whole body to `<DeviceModuleGrid>`; the
  Drying Recommendations section is unchanged.
- [x] Seed: added a demo `printer_external_spool` `Location` (A1 mini #2, no sensor of its own — a
  bare external-spool holder has no consolidated reading) + a demo spool assigned there — no such
  location was ever seeded before, so the new external-spool slot visual had nothing real to render
  without this addition.
- [x] Tests: `lib/deviceModules.test.ts`, `lib/deviceType.test.ts`, `EnvMetricTile.test.tsx`,
  `DeviceModuleCard.test.tsx` (6 tests: AMS grid render, external-spool render, offline state with
  slots still editable, no-sensor state, no-slots-configured state, click wiring),
  `StandaloneLocationCard.test.tsx`; `Dashboard.test.tsx` updated to the new tree (same 4
  loading/error/empty/populated states, new API mocks for locations/spools/materials/assignments).
- [x] Discovered and fixed a real gap while writing these components: neither `DeviceModuleCard`
  nor `StandaloneLocationCard` initially surfaced the sensor's serial number, type, or timestamp —
  `docs/Requirements.md` §11.1 explicitly requires showing "timestamp and source mode: real or
  mock." Added a small subtext row (serial + `StatusBadge` + timestamp) to both components before
  finalizing.
- [x] `npx vitest run` (60 passed, 14 files), `tsc -b`/`build`/`lint` clean, backend suite 138
  passed (seed-only change).
- [x] Playwright verification: `/` shows every seeded printer as a device module — AMS printers
  (A1 mini #1, P1S #1) render real, editable slot grids (P1S #1's A3 correctly shows the
  `sensor-per-ams-module` task's demo spool via the shared-sensor expansion); the new
  `external_spool` demo location renders the "Ext" slot with its seeded spool; printers with no
  sensor/locations show the correct empty states; clicking an empty slot opens the existing
  `SlotAssignmentModal` unmodified; standalone locations (room/storage box/dry box) render as their
  own simpler modules; light mode toggled and confirmed consistent. Screenshots:
  `evidence/frontend-verification/dashboard-device-modules.png`,
  `evidence/frontend-verification/dashboard-slot-modal.png`,
  `evidence/frontend-verification/dashboard-light-mode.png`.
- [x] `docs/Dashboard_Device_Redesign_Guide.md` written (new); updated
  `docs/Frontend_Redesign_Guide.md` §9.

## Phase 30 — Dashboard Correctness Fixes + Advanced Filters

See `docs/Tareas/dashboard-filters-and-fixes/TASK.md` and
`docs/Dashboard_Filters_And_Assignments_Guide.md` for the full task record. The user reported 3
concrete bugs from Dashboard screenshots (truncated/1-decimal environmental values, an
overly-restrictive spool selector with no create-spool path, and Drying Recommendations always
empty despite visible warnings) plus a much larger feature request (filters, printer operational
status, sensor assignment from the dashboard, AMS↔external-spool switching from the dashboard).
Per `CLAUDE.md`'s MVP-focused constraint, the user was asked to prioritize and chose: fix the 3
bugs + build a first version of Dashboard filters, deferring the rest.

- [x] `lib/format.ts` (new): centralized 2-decimal environmental-value formatters
  (`formatTemperature`/`formatHumidity`/`formatPressure`/`formatDewPoint`), replacing 5+ duplicated
  ad hoc `.toFixed(1)` call sites.
- [x] Fixed `EnvMetricTile.tsx`'s value-truncation bug (`truncate` class inside a `min-w-0`
  container clipped long values like "31.24 °C" to "31..."): removed truncation, changed the
  metric-tile grid from `grid-cols-2 sm:grid-cols-4` to a fixed `grid-cols-2` for more width per
  tile.
- [x] Backend: `alert_service.py`/`drying_service.py` now round floats before interpolating them
  into alert/recommendation message strings.
- [x] `lib/spoolAvailability.ts` (new): extracted the "available spools" filter (already correct,
  previously duplicated in `DeviceModuleGrid.tsx` and `PrinterDetail.tsx`) into one testable
  function.
- [x] `SlotAssignmentModal.tsx`: spool selector now shows each option's `StatusBadge`; added an
  inline "+ Create new spool" flow (reuses the existing `SpoolForm` + `useCreateSpool()`) that
  auto-selects the newly created spool.
- [x] Fixed the real Drying Recommendations bug: `drying_service.py` looked up the latest `Reading`
  by the exact `location_id` a spool was assigned to, but a shared-AMS-sensor module (per Phase 28)
  only persists readings at the slot the sensor is attached to — a spool in a sibling slot was
  silently skipped. Now reuses `alert_service._resolve_covered_location_ids` to expand to sibling
  locations before looking up the latest reading, matching what the Dashboard's alert panel already
  shows for that spool.
- [x] `lib/deviceFilters.ts` + `DashboardFilters.tsx` (new): first version of Dashboard filters
  (search, alert status, sensor status, slot status, printer brand, filament type/brand/color/
  status), reusing `FilamentFilters.tsx`'s controlled-component shape, filtering client-side over
  already-fetched data. Printer brands/filament types/brands/colors are generated dynamically from
  the data, never hardcoded. Wired into `DeviceModuleGrid.tsx` with a live result counter, removable
  filter chips, and an explicit "No devices match the current filters." empty state.
- [x] Tests: `format.test.ts`, `spoolAvailability.test.ts`, `deviceFilters.test.ts` (11 tests),
  `DashboardFilters.test.tsx`, `SlotAssignmentModal.test.tsx` (new — empty state, create-spool flow,
  status badge in selector); updated `EnvMetricTile.test.tsx` (no truncate class),
  `StandaloneLocationCard.test.tsx`/`Dashboard.test.tsx` (2-decimal assertions); backend
  `test_drying_service.py` new case for sibling-AMS-slot reading expansion.
- [x] `npx vitest run` (93 passed, 19 files), `tsc -b`/`build`/`lint` clean, backend suite 139
  passed.
- [x] `docs/Dashboard_Filters_And_Assignments_Guide.md` written (new); updated
  `docs/Frontend_Redesign_Guide.md` §9.
- [x] Playwright browser verification: confirmed full-value 2-decimal display in dark/light mode,
  filter narrowing (e.g. "No sensor assigned"), the create-spool-from-modal flow syncing to
  `/spools`, and Drying Recommendations correctly surfacing the AMS sibling-slot spool.

### Phase 30 follow-up — Drying Recommendations vs live alerts inconsistency

During the user's own browser validation, they caught a real remaining bug: Drying Recommendations
showed 3 criticals while the printer/location cards showed only 1 active alert. The initial
sibling-AMS-expansion fix above only patched half of Bug 3 — `get_drying_recommendations` still
read a **persisted** `Reading` row (only ever written via "Capture reading now" on `/history`),
which could be minutes stale relative to what `GET /readings/current` computes live for the
Dashboard's alert panels.

- [x] `drying_service.get_drying_recommendations` rewritten to stop touching the `Reading` table
  entirely: it now iterates every active `Sensor`, takes a live read via the same
  `get_sensor_reader_for_sensor(...).read_current()` call `GET /readings/current` uses, and expands
  to covered sibling locations (`alert_service._resolve_covered_location_ids`) before evaluating
  humidity severity — the identical computation the Dashboard's `AlertPanel` performs, guaranteeing
  the two can never structurally disagree beyond one poll tick's worth of live-sensor drift.
- [x] `Dashboard.tsx` now passes its own `refreshInterval` (from `useRefreshInterval()`, the
  user-configurable Settings value) into `useDryingRecommendations(refreshInterval)` instead of a
  hardcoded 15s default, so Drying Recommendations refetches on the same cadence as the
  printer/location alert panels.
- [x] `backend/tests/services/test_drying_service.py` rewritten: tests now monkeypatch
  `get_sensor_reader_for_sensor` for a fixed live reading (same pattern as
  `tests/api/test_sensors.py`) instead of seeding `Reading` rows, since severity is no longer read
  from that table.
- [x] Found and fixed a latent test-isolation bug surfaced by this refactor:
  `test_no_dryer_configured_sets_capability_none` did a blanket `DELETE FROM locations WHERE
  location_type='dryer'` without cleaning up dependent `SpoolAssignment`/`Sensor` rows first —
  SQLite reuses a deleted row's freed integer id for the next insert in that table, so the orphaned
  rows would silently reattach to whatever unrelated new `Location` a later test created next,
  corrupting that test's data. This was always latent (the old `Reading`-based code just never
  surfaced it, since `Reading` was cleared every test regardless). Fixed by deleting dependent rows
  first; verified by running the full suite in multiple file orderings.
  `tests/api/test_drying.py`'s `test_get_recommendations_returns_empty_list_when_no_reading_history`
  was also order-dependent for the same underlying reason and was rewritten to assert only its own
  seeded spool's exclusion, not global emptiness.
- [x] Cleaned up debugging-artifact rows (test locations/sensors/spools) that had leaked into the
  real dev database during manual backend debugging via ad hoc scripts that didn't set
  `DATABASE_URL=sqlite:///:memory:`.
- [x] `pytest -q` (139 passed, re-verified across 3 file orderings), `npx vitest run` (93 passed).
- [x] Playwright re-verification: confirmed the printer/location cards and Drying Recommendations
  now show a consistent 0-vs-0 empty state on the live dev DB after cleanup.

## Phase 31 — Dashboard Admin Controls (bell, printer status, sensor/filament-system assignment, filter persistence)

See `docs/Tareas/dashboard-admin-controls/TASK.md` and `docs/Dashboard_Admin_Controls_Guide.md` for
the full task record. During browser validation of Phase 30, the user reported the sidebar's
"Alerts" page didn't reflect the Dashboard's live alerts, and asked for it to become a global
notification-bell popover — plus the four items Phase 30's own guide had explicitly deferred:
printer operational status, embedded sensor assignment, AMS↔external-spool switching, and filter
persistence.

- [x] Diagnosed the Alerts bug as the same "live vs persisted" class already fixed for Drying
  Recommendations — but `/alerts`/`Alert` back a real resolve/audit workflow this time, so the fix
  is a new live view (`AlertsBell.tsx`, fed by the same `["current-reading"]` query the Dashboard's
  `AlertPanel` uses), not making `/alerts` itself live. New `ui/popover.tsx` (Radix wrapper, no new
  dependency). Sidebar "Alerts" nav link removed from `Layout.tsx`; `/alerts` page unchanged.
- [x] `Printer.operational_status` ("activo"/"inactivo"/"mantenimiento", default "activo") added
  following the exact `filament_system_type` precedent (model column, schema, service-layer
  validation, no DB enum). Editable from `DeviceModuleCard` (Dashboard) and inline in `Printers.tsx`
  (both call the same `PATCH /printers/{id}` + `useUpdatePrinter()`, staying in sync via the shared
  query cache). Non-"activo" dims the card visually; never gates or suppresses alerts (administrative
  status is a separate axis from real environmental risk). New dashboard filter criterion.
- [x] `printer_service._sync_locations_for_filament_system_type`: non-destructive Location-row sync
  on a `filament_system_type` change (only ever creates missing rows for the new type — 4 AMS slots
  or 1 external-spool location — never deletes existing ones), making AMS↔external-spool toggling
  idempotent and safe against orphaning assignments/sensors. Dashboard toggle limited to
  ams/external_spool (2 values); `/printers` keeps all 4. `hooks/resources/printers.ts` now
  invalidates `"locations"` too so the Dashboard picks up newly-synced slots immediately.
- [x] Sensor assignment/reassignment from the Dashboard needed zero backend changes (`PATCH
  /sensors/{id}` + the existing AMS-conflict check already supported it) — only UI. Hoisted
  `buildLocationOptions` from `SensorForm.tsx` into `lib/sensorLocation.ts` (shared with two new
  helpers, `representativeLocationForPrinter`/`currentSensorForPrinter`); new
  `SensorAssignmentModal.tsx` mirrors `SlotAssignmentModal`'s shared-modal architecture; reassigning
  is two sequential calls (unassign then assign), matching the existing spool-reassignment pattern.
  `/sensors` gained its first-ever inline edit control (previously create/delete only) for 1:1
  symmetry.
- [x] `frontend/src/hooks/useDeviceFilters.ts`: filter persistence via localStorage, versioned key,
  merge-over-defaults (missing keys/malformed JSON never leave a field `undefined`). Unlike
  `useRefreshInterval` (read-only), this hook's setter persists on every change since filters change
  directly on the Dashboard. New "Dashboard filters" card in `Settings.tsx` with a "Reset filters"
  button.
- [x] Tests: `printerStatus.test.ts`, `sensorLocation.test.ts` (new helpers), `deviceFilters.test.ts`
  (`printerStatus` criterion), `SensorAssignmentModal.test.tsx` (new), `DeviceModuleCard.test.tsx`
  (extended: selects, dimming, assign-sensor button), `useDeviceFilters.test.ts` (new),
  `AlertsBell.test.tsx` (new), `Layout.test.tsx` (new — confirms nav link removed, bell present),
  `Printers.test.tsx`/`Sensors.test.tsx`/`Settings.test.tsx` (new — first test files for these
  pages); backend `test_printers.py` extended with `operational_status` + Location-sync tests
  (idempotent AMS↔external_spool alternation, never-delete guarantee).
- [x] `pytest -q` (149 passed), `npx vitest run` (146 passed), `tsc -b`/`build`/`lint` clean.

## Phase 32 — Dashboard Admin Controls Round 2 (alert location, auto-capture history, status colors, AMS/spool ghost-assignment fix + hybrid type, sensor creation in modal)

See `docs/Tareas/dashboard-admin-controls-round-2/TASK.md` and
`docs/Dashboard_Admin_Controls_Round2_Guide.md` for the full task record. Browser validation of
Phase 31 surfaced five follow-up issues.

- [x] `AlertsBell.tsx` now threads each alert's `SensorReadingEntry.location` through
  `describeSensorLocation()` (already used elsewhere for this exact purpose) so every popover row
  shows where the filament is (printer/AMS/external-spool/storage location), falling back to the
  sensor's serial number for an orphan sensor with no location.
- [x] Root-caused `/alerts` staying empty forever: `Reading`/`Alert` rows are only ever persisted by
  `POST /readings`, which nothing called automatically — the Dashboard's live polling
  (`GET /readings/current`) never persists. New `app/services/auto_capture.py`'s
  `run_auto_capture_loop`, started as an asyncio task from `app/main.py`'s lifespan
  (`Settings.auto_capture_interval_seconds`, default 30s), now calls the existing
  `capture_and_persist_all_active_sensors` automatically on an interval, so real history
  accumulates without anyone clicking "Capture reading now". Disabled deterministically in tests via
  `AUTO_CAPTURE_INTERVAL_SECONDS=0` in `conftest.py`.
- [x] `lib/printerStatus.ts` already defined `printerStatusBadgeClassName()` (green/yellow) but it was
  never actually applied anywhere, and `inactivo` mapped to grey, not the requested red. Fixed the
  `inactivo` mapping to `destructive` (red) and applied the classname to the operational-status
  `Select` trigger in both `DeviceModuleCard.tsx` and `Printers.tsx`.
- [x] Root-caused the AMS↔external-spool "ghost assignment" bug: `DeviceModuleCard.tsx`'s slot section
  was an `if amsLocations.length > 0 {...} else if externalSpoolLocations.length > 0 {...}` —
  mutually exclusive — even though `lib/deviceModules.ts` already computes both arrays independently
  from real (non-destructively-synced) `Location` rows. After switching types, a printer can
  legitimately have both kinds of Locations (and an active `SpoolAssignment` on the now-hidden one),
  but the card only ever rendered one branch. Changed to two independent conditionals (both render
  when both are non-empty), which fixes the visibility bug with zero backend change and, as a bonus,
  is exactly what's needed to support a third `ams_external_spool` filament-system-type value for
  printers that use both at once (`printer_service.py`'s sync now ensures both an AMS set and an
  external-spool Location when switched to this value; `PrinterForm.FILAMENT_SYSTEM_TYPES` and
  `DeviceModuleCard`'s Dashboard-embedded toggle both gained the third option;
  `lib/deviceType.ts` got a matching icon/label).
- [x] `SensorAssignmentModal.tsx` gained inline "+ Create new sensor" (name/model/serial/type/port),
  mirroring `SlotAssignmentModal`'s embedded-`SpoolForm` pattern for spools — simpler here since
  `Sensor.location_id` is a direct field (no separate assignment row), so creating with
  `location_id` set to the modal's target location assigns it in one step. Disabled (with an inline
  note) while a sensor is already assigned, since a second one for the same location would trip the
  existing AMS one-sensor-per-module 400.
- [x] Tests: `AlertsBell.test.tsx` (location-context cases), `printerStatus.test.ts` (destructive tone
  for inactivo), `DeviceModuleCard.test.tsx` (dual-rendering case), `deviceType.test.ts`
  (`ams_external_spool`), `SensorAssignmentModal.test.tsx` (create-and-assign, disabled-while-assigned),
  new backend `test_auto_capture.py`, `test_printers.py` extended (`ams_external_spool` sync +
  idempotency).
- [x] `pytest -q` (153 passed), `npx vitest run` (153 passed), `tsc -b`/`build`/`lint` clean.
- [x] **Addendum** (same-day follow-on from browser validation): the dual-rendering fix above was
  itself too permissive — it showed both slot kinds whenever both had real Locations, regardless of
  the printer's own `filament_system_type` selector (e.g. a printer set to "AMS" still showing an
  External Spool slot). Fixed by resolving which slot kind(s) apply from `filament_system_type`
  itself in `lib/deviceModules.ts`'s `buildDeviceModules` (`slotKindsForFilamentSystemType`), which
  automatically keeps `DeviceModuleCard.tsx` and `deviceFilters.ts` consistent (both already consume
  this function's output). Real alerts/affected-spools for a now-hidden Location still surface
  (sensor-driven, not slot-kind-driven) — only the slot tile is hidden. 4 new
  `deviceModules.test.ts` cases; `npx vitest run` (157 passed), `tsc -b` clean.

## Phase 33 — Final Review: Full-Stack Bug Sweep

See `docs/Tareas/final-review-bug-sweep/TASK.md` and `docs/Final_Review_Bug_Sweep_Guide.md` for the
full task record. Requested by the user as a last pass before marking the project complete: find
and fix real bugs, separately identify (without necessarily implementing) further improvement
opportunities with concrete tools, then re-validate everything.

- [x] Three parallel subagent reviews (backend, frontend, security) + manual Playwright sweep of
  every page (console-error check on each) + direct `curl` reproduction of every suspected bug
  before treating it as real.
- [x] Fixed: `MaterialProfile` create/update accepted internally inconsistent thresholds (e.g.
  `ideal_rh_max_percent > critical_rh_max_percent`) with zero validation, silently inverting
  `alert_service`'s severity comparisons for that material. New `_validate_thresholds()` in
  `material_profile_service.py`, applied to both create and the merged-with-existing-row result of
  an update.
- [x] Fixed: SQLite foreign keys were never enforced (no `PRAGMA foreign_keys=ON`) — reproduced
  concretely (deleting a `Location` referenced by an active `SpoolAssignment` silently succeeded
  instead of the advertised 400). `db/session.py` now enables the pragma (+ `journal_mode=WAL`,
  a zero-risk addition that lets the auto-capture background loop coexist with concurrent
  requests) on every SQLite connection via an `event.listens_for(engine, "connect")` handler.
- [x] Fixed: several create/update endpoints never checked a referenced foreign key actually
  existed (`Sensor.location_id`, `SpoolAssignment.spool_id`/`location_id`,
  `FilamentSpool.material_profile_id`, `Location.printer_id`) — reproduced concretely
  (`POST /assignments` with nonexistent ids returned 200). Added `_check_*_exists()` helpers
  mirroring the existing `get_*_or_404`/`create_drying_session` pattern.
- [x] Fixed: hourly dew-point average in `reading_service.get_readings_history` divided by every
  reading in the bucket instead of only the ones with a non-null `dew_point_c` — currently latent
  (no live write path leaves it null) but fixed and regression-tested via direct `save_reading()`
  insertion.
- [x] Fixed: `useCreateSensor`/`useUpdateSensor`/`useCreateAssignment`/`useUpdateAssignment` never
  invalidated the `"current-reading"` query, leaving Dashboard cards stale after a
  sensor/spool reassignment until the next poll tick. Verified live: the card now updates the
  instant the mutation resolves.
- [x] Fixed: `History.tsx` showed "No readings in this range yet" before the user had ever clicked
  "Load history" (query is `enabled: false`), indistinguishable from a genuine empty result. Added
  an `isFetched`-gated "choose a range and search" prompt.
- [x] Documented (not implemented, per explicit scope): route-based code splitting for the ~880kB
  main chunk, missing DB indexes on hot-path filter columns, a duplicate `get_affected_spools`
  query per request, missing loading/error states on several list pages, a color-only status dot
  with no ARIA label, `StatusBadge` missing sensor-type color entries, and a `sensor_type` naming
  collision between two different value domains.
- [x] `pytest -q` (170 passed, 12 new), `npx vitest run` (160 passed, 4 new), `tsc -b`/`build`/`lint`
  clean. All demo data touched during live verification restored to its original state.

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
