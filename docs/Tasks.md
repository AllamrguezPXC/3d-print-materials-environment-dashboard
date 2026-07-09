# Tasks.md

# Implementation Tasks for 3D Print Materials Environment Data Monitoring Dashboard

This task list is designed for an intermediate developer working with Claude Code. Each task should be small enough to complete, test, and commit independently.

## Phase 0 — Repository Preparation and Claude Code Setup

- [ ] Open the project folder in Claude Code: `C:\Users\AllamRodriguez\Desktop\Programas\3D Print Materials Environment Data Monitoring Dashboard`.
- [ ] Ask Claude Code to inspect the existing `.claude/` folder and `Inpiration CLAUDE.md` before overwriting anything.
- [ ] Ask Claude Code to compare existing agents, hooks, and skills against `docs/Requirements.md`.
- [ ] Backup or rename any unrelated old `.claude` files before adapting them.
- [ ] Create or update root `CLAUDE.md` using the project-specific version in this starter pack.
- [ ] Confirm `.claude/settings.json` loads the safety/evidence hooks.
- [ ] Create `/evidence` and `EVIDENCE.md` if they do not exist.
- [ ] Initialize Git repository if needed.
- [ ] Create `.gitignore` for Python, Node, SQLite DB files, `.env`, and build artifacts.

## Phase 1 — Backend Foundation

- [ ] Create backend Python virtual environment.
- [ ] Add backend dependencies: FastAPI, Uvicorn, SQLAlchemy, Pydantic, pytest, httpx, pyserial.
- [ ] Create `backend/app/main.py` with a FastAPI app and `/health` endpoint.
- [ ] Configure CORS for local frontend origin.
- [ ] Create Pydantic settings in `backend/app/core/config.py`.
- [ ] Create SQLAlchemy engine/session setup.
- [ ] Add initial pytest setup with `backend/tests/conftest.py`.
- [ ] Add a test for `GET /health`.
- [ ] Run pytest and commit the working backend skeleton.

## Phase 2 — Sensor Abstraction and Mock Sensor

- [ ] Define `SensorReadingDTO` schema with timestamp, temperature, humidity, pressure, source, sensor metadata.
- [ ] Define a `SensorReader` protocol/base class.
- [ ] Implement `MockSensorReader` with bounded random-walk behavior.
- [ ] Ensure mock values drift realistically over time.
- [ ] Add tests confirming mock readings include temperature, humidity, pressure, and timestamps.
- [ ] Add tests confirming mock readings remain within configured safe bounds.
- [ ] Add a sensor factory that chooses `mock`, `dracal_vcp`, or `dracal_cli` from settings.

## Phase 3 — TDD Cycle for Required Endpoint

- [ ] In Plan Mode, ask Claude to design the first TDD cycle for `GET /readings/current`.
- [ ] Write failing pytest for `GET /readings/current` before implementation.
- [ ] Save failing test output to `/evidence/tdd-current-reading-fail.txt`.
- [ ] Implement `GET /readings/current` using the mock sensor.
- [ ] Run pytest again.
- [ ] Save passing test output to `/evidence/tdd-current-reading-pass.txt`.
- [ ] Document the TDD cycle in `EVIDENCE.md`.

## Phase 4 — Database Models and Persistence

- [ ] Create SQLAlchemy models for Sensor, Location, Printer, MaterialProfile, FilamentSpool, SpoolAssignment, Reading, Alert, DryingSession.
- [ ] Create Pydantic schemas for read/create/update operations.
- [ ] Create repositories or service helpers for CRUD operations.
- [ ] Implement idempotent seed script for initial printers, material profiles, sensor, mock locations, and demo spools.
- [ ] Add tests for database creation and seed idempotency.
- [ ] Decide whether to use SQLAlchemy `create_all` for MVP or Alembic for stretch.

## Phase 5 — Required Reading Endpoints

- [ ] Implement `POST /readings` to capture current sensor reading and persist it.
- [ ] Allow `POST /readings` to optionally accept a manual/mock reading payload.
- [ ] Implement `GET /readings?from=&to=` with date filtering.
- [ ] Add optional filters for sensor and location.
- [ ] Add `aggregate=hour` support for hourly averages.
- [ ] Add tests for `POST /readings` persistence.
- [ ] Add tests for date range filtering.
- [ ] Add tests for hourly aggregation.
- [ ] Confirm the three assignment endpoints pass pytest.

## Phase 6 — Material Profiles and Alert Logic

- [ ] Implement material profile service with default seed values from `docs/Requirements.md`.
- [ ] Implement environment evaluation service.
- [ ] Evaluate humidity against material thresholds.
- [ ] Evaluate temperature against material thresholds.
- [ ] Compute dew point and condensation warning.
- [ ] Generate alert DTOs for affected spools/materials.
- [ ] Persist alerts when readings are saved.
- [ ] Add tests for high-humidity warning and critical states.
- [ ] Add tests showing pressure is recorded but does not normally cause material readiness alerts.

## Phase 7 — CRUD APIs for Configuration

- [ ] Implement `/sensors` CRUD endpoints.
- [ ] Implement `/printers` CRUD endpoints.
- [ ] Implement `/locations` CRUD endpoints.
- [ ] Implement `/materials` CRUD endpoints.
- [ ] Implement `/spools` CRUD endpoints.
- [ ] Implement `/assignments` CRUD endpoints.
- [ ] Implement `/alerts` listing and resolve endpoint.
- [ ] Add basic tests for key CRUD endpoints.
- [ ] Validate request bodies with Pydantic.

## Phase 8 — Drying Recommendations and Sessions

- [ ] Implement drying recommendation service based on material profiles and current alerts.
- [ ] Add dryer model/profile fields such as max temperature and notes.
- [ ] Display warning when selected dryer cannot reach recommended drying temperature.
- [ ] Implement `/drying/recommendations` endpoint.
- [ ] Implement drying session create/list/update endpoints.
- [ ] Add tests for PETG, Nylon/PA, PC, PVA/BVOH recommendations.
- [ ] Ensure recommendations say the dryer is not automatically controlled.

## Phase 9 — Dracal VCP Parser and Optional Real Hardware Mode

- [ ] Implement parser for VCP line format, e.g. `D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5`.
- [ ] Parse pressure in Pa, temperature in C, humidity in %RH.
- [ ] Validate expected product prefix and serial number when configured.
- [ ] Handle malformed payloads with clear exceptions.
- [ ] Add pytest coverage for valid line, invalid line, wrong serial, missing channel.
- [ ] Implement optional pyserial reader if hardware is available.
- [ ] Add `.env.example` with `DRACAL_VCP_PORT=COM3` and `DRACAL_SERIAL_NUMBER=E25877`.
- [ ] Keep mock mode as default.

## Phase 10 — Frontend Foundation

- [ ] Create React app with Vite and TypeScript.
- [ ] Add frontend dependencies: Recharts or Chart.js, date utilities, optional UI library.
- [ ] Create API client module with base URL config.
- [ ] Create app layout with sidebar/topbar.
- [ ] Implement dark theme as default.
- [ ] Implement light/dark theme toggle with localStorage.
- [ ] Add placeholder routes: Dashboard, History, Printers, Materials, Spools, Drying, Settings.
- [ ] Confirm frontend runs locally.

## Phase 11 — Main Dashboard UI

- [ ] Fetch `/readings/current` every 2–5 seconds.
- [ ] Display current sensor cards for temperature, humidity, pressure, and dew point.
- [ ] Display printer/location and sensor metadata.
- [ ] Display affected spools and material profiles.
- [ ] Display alert panel with severity styling.
- [ ] Display drying recommendation cards.
- [ ] Show timestamp and source mode: mock or real.
- [ ] Add loading and error states.

## Phase 12 — History Chart UI

- [ ] Build date-time range picker.
- [ ] Fetch `GET /readings?from=&to=&aggregate=hour`.
- [ ] Render line chart for temperature.
- [ ] Render line chart for relative humidity.
- [ ] Render line chart for pressure.
- [ ] Allow filtering by sensor or location.
- [ ] Show empty state when no readings exist.
- [ ] Add manual “capture reading” button that calls `POST /readings`.

## Phase 13 — Configuration Screens

- [ ] Build printers management screen.
- [ ] Build locations management screen.
- [ ] Build material profiles management screen.
- [ ] Build spools management screen.
- [ ] Build spool assignment form.
- [ ] Build settings screen for sensor mode and refresh interval.
- [ ] Validate forms before submit.
- [ ] Show success/error notifications.

## Phase 14 — Documentation and Evidence

- [ ] Generate `README.md` with setup instructions for backend and frontend.
- [ ] Document mock mode and real Dracal VCP mode.
- [ ] Document the three required endpoints.
- [ ] Document material profile assumptions and editability.
- [ ] Add screenshots of dashboard, history chart, and settings screens.
- [ ] Add evidence for Plan Mode / Ask Mode.
- [ ] Add evidence for custom skills.
- [ ] Add evidence for custom hooks.
- [ ] Add evidence for subagents.
- [ ] Add evidence for TDD cycle.
- [ ] Add evidence for security review.
- [ ] Add evidence for GitHub MCP action.

## Phase 15 — Security Review

- [ ] Ask Claude Code to review `POST /readings` for validation, persistence, and sensor access risks.
- [ ] Fix any reasonable findings.
- [ ] Document findings and fixes in `EVIDENCE.md`.
- [ ] Confirm CORS is limited to local origins.
- [ ] Confirm `.env` and SQLite database files are ignored by Git.
- [ ] Confirm hooks block dangerous shell commands.

## Phase 16 — GitHub and Final Submission

- [ ] Create GitHub repository.
- [ ] Use GitHub MCP for at least one real action: create an issue, make a commit, open PR, or review PR.
- [ ] Commit project source and Claude artifacts.
- [ ] Verify all backend tests pass.
- [ ] Verify frontend runs and consumes backend.
- [ ] Verify README instructions work from a clean clone.
- [ ] Confirm no secrets or local DB files are committed.
- [ ] Prepare final evidence summary.

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
