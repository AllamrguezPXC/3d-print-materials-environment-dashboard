# Requirements.md

# 3D Print Materials Environment Data Monitoring Dashboard

## 1. Overview

Build a local web application for monitoring environmental conditions that affect 3D printing filament storage and readiness.

The system monitors live temperature, relative humidity, and atmospheric pressure using a Dracal PTH450-class sensor, starting with the available device:

- Model: `VCP-PTH450-CAL`
- Serial: `E25877`
- Channels: temperature, relative humidity, atmospheric/barometric pressure
- Initial installation target: inside or near Bambu Lab AMS / AMS Lite areas, next to active printer filament, or in filament storage areas
- Future expansion: multiple Dracal sensors of the same model assigned to different printers, AMS units, dryers, or storage locations

The project must be implemented as a local full-stack application with:

- Python backend using FastAPI
- React frontend
- SQLite persistence through SQLAlchemy
- pytest test coverage
- Evidence of effective Claude Code usage through CLAUDE.md, custom skills, custom hooks, subagents, Plan Mode / Ask Mode, TDD, documentation, security review, and GitHub MCP usage

The assignment’s minimum core is intentionally small: a real-time environmental dashboard with exactly three required use cases. This project extends that core into a practical filament preservation dashboard while keeping the three assignment endpoints functional and testable.

## 2. Project Goals

### 2.1 Primary Goal

Create a dashboard that shows the current environmental status for each registered sensor, printer, AMS/storage location, and assigned filament spool. The main screen must immediately answer:

- What is the current temperature, relative humidity, and pressure?
- Which printer, AMS, dryer, or storage location is affected?
- Which filament spools/materials are currently outside their configured limits?
- What drying action is recommended before printing?

### 2.2 Educational Goal

Demonstrate structured use of Claude Code as a development partner, not just autocomplete. The repository must make the Claude Code workflow auditable through:

- `CLAUDE.md`
- `.claude/agents/`
- `.claude/skills/`
- `.claude/hooks/`
- `/docs/Requirements.md`
- `/docs/Tasks.md`
- `README.md`
- `EVIDENCE.md` or `/evidence/`
- documented TDD cycle
- documented security review
- GitHub MCP evidence

### 2.3 Non-Goals for MVP

The MVP does not need to directly control printers, AMS units, or the Ivation dehydrator. It should recommend actions, record data, and validate environmental results.

The MVP does not need cloud deployment, authentication, multi-user roles, or production-grade alert delivery. Local browser usage is sufficient.

The system should not hard-code manufacturer values as immutable truth. Filament thresholds and drying recommendations must be stored as editable material profiles.

## 3. Required Tech Stack

### 3.1 Backend

- Python 3.11+ recommended
- FastAPI
- Uvicorn
- SQLAlchemy 2.x
- SQLite
- Pydantic v2
- pytest
- pytest-asyncio or anyio if async tests are used
- httpx for API tests
- pyserial for VCP Dracal mode, optional until real hardware integration is enabled

### 3.2 Frontend

- React
- TypeScript strongly recommended
- Vite recommended
- Recharts or Chart.js for history line charts
- CSS modules, Tailwind, shadcn/ui, or simple custom CSS are acceptable
- Dark mode by default
- Light mode toggle required

### 3.3 Development Tooling

- Claude Code
- Git and GitHub
- GitHub MCP integration for at least one real action
- Python virtual environment
- npm or pnpm

## 4. Repository Structure

Recommended final structure:

```text
3D Print Materials Environment Data Monitoring Dashboard/
├── CLAUDE.md
├── README.md
├── EVIDENCE.md
├── .env.example
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── time.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── seed.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── sensors/
│   │   │   ├── base.py
│   │   │   ├── dracal_vcp.py
│   │   │   ├── dracal_cli.py
│   │   │   ├── mock.py
│   │   │   └── factory.py
│   │   └── api/
│   │       └── v1/
│   │           ├── readings.py
│   │           ├── sensors.py
│   │           ├── printers.py
│   │           ├── materials.py
│   │           ├── spools.py
│   │           ├── alerts.py
│   │           └── drying.py
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── styles/
│   │   └── main.tsx
│   ├── package.json
│   └── README.md
├── docs/
│   ├── Requirements.md
│   ├── Tasks.md
│   ├── Prompt_Pack.md
│   └── Claude_Code_Workflow_Guide.md
├── evidence/
└── .claude/
    ├── settings.json
    ├── agents/
    ├── hooks/
    ├── skills/
    └── context-handoffs/
```

## 5. Assignment Compliance Matrix

| Assignment Requirement | Implementation Requirement |
|---|---|
| React frontend | Build local React dashboard that consumes FastAPI endpoints. |
| FastAPI backend | Implement REST API in `backend/app`. |
| SQLAlchemy + SQLite | Store readings, sensors, printers, material profiles, spool assignments, alerts, and drying sessions. |
| pytest | Cover required endpoints and core service logic. |
| Dracal sensor | Abstract behind sensor interface with real VCP/CLI reader and mock reader. |
| Mock mode | Must work without hardware. Mock values should drift realistically over time. |
| GET `/readings/current` | Return current environmental reading and status evaluation. |
| POST `/readings` | Capture and persist a reading with timestamp. |
| GET `/readings?from=&to=` | Return filtered history, with optional hourly aggregation. |
| Chart | Frontend must show line chart for historical values. |
| CLAUDE.md | Root file with project context, conventions, commands, restrictions. |
| Custom Skill | At least one project skill under `.claude/skills/`; this starter includes several. |
| Custom Hook | At least one project hook under `.claude/hooks/`; this starter includes safety and evidence hooks. |
| Evidence | Maintain `/evidence` and/or `EVIDENCE.md` with screenshots/logs. |
| Security review | Ask Claude to review the most critical endpoint and document results. |
| GitHub MCP | Use GitHub MCP for at least one real action and document it. |

## 6. Domain Model

### 6.1 Core Entities

#### Sensor

Represents a physical or mock sensor.

Suggested fields:

- `id`
- `name`
- `model`
- `serial_number`
- `sensor_type`: `dracal_vcp`, `dracal_cli`, `mock`
- `port`: optional, e.g. COM port for VCP mode
- `is_active`
- `location_id`
- `created_at`
- `updated_at`

#### Location

Represents where the sensor is installed.

Suggested values for `location_type`:

- `printer_ams`
- `printer_external_spool`
- `storage_box`
- `dry_box`
- `dryer`
- `room`

Suggested fields:

- `id`
- `name`
- `location_type`
- `printer_id`, optional
- `description`

#### Printer

Represents a 3D printer.

Suggested fields:

- `id`
- `name`
- `brand`, e.g. `Bambu Lab`
- `model`, e.g. `A1 mini`, `P1S`, `P1P`
- `serial_number`, optional
- `notes`

Initial seed printers may include:

- 4 × Bambu Lab A1 mini
- 2 × Bambu Lab P1S
- 1 × Bambu Lab P1P

These should be editable, not hard-coded.

#### MaterialProfile

Represents environmental and drying requirements for a filament family or manufacturer-specific material.

Suggested fields:

- `id`
- `name`, e.g. `PLA`, `PETG`, `ASA`, `Nylon`
- `family`, e.g. `PLA-derived`, `PET-derived`, `PA-derived`
- `manufacturer`, optional
- `variant`, optional, e.g. `PLA-CF`, `PA6-CF`, `TPU 95A`
- `ideal_temp_min_c`
- `ideal_temp_max_c`
- `warning_temp_min_c`
- `warning_temp_max_c`
- `critical_temp_min_c`
- `critical_temp_max_c`
- `ideal_rh_max_percent`
- `warning_rh_max_percent`
- `critical_rh_max_percent`
- `drying_temp_c`
- `drying_time_hours_min`
- `drying_time_hours_max`
- `storage_notes`
- `drying_notes`
- `source_notes`

#### FilamentSpool

Represents a physical spool.

Suggested fields:

- `id`
- `material_profile_id`
- `brand`
- `color`
- `diameter_mm`, default `1.75`
- `initial_weight_g`, optional
- `remaining_weight_g`, optional
- `quantity_label`, optional
- `purchase_date`, optional
- `opened_at`, optional
- `last_dried_at`, optional
- `status`: `ready`, `watch`, `needs_drying`, `quarantine`, `unknown`

#### SpoolAssignment

Represents which spool is currently assigned to a printer, AMS slot, dryer, or storage location.

Suggested fields:

- `id`
- `spool_id`
- `location_id`
- `slot_name`, e.g. `AMS Slot 1`, `AMS Lite Slot 3`, `Dryer Tray 2`
- `is_active`
- `assigned_at`
- `removed_at`

#### Reading

Represents an environmental sample.

Suggested fields:

- `id`
- `sensor_id`
- `location_id`
- `timestamp`
- `temperature_c`
- `relative_humidity_percent`
- `pressure_pa`
- `pressure_kpa`
- `dew_point_c`, optional computed field
- `source`: `real`, `mock`, `manual`
- `raw_payload`, optional

#### Alert

Represents a threshold violation for one or more spools/materials affected by a sensor reading.

Suggested fields:

- `id`
- `reading_id`
- `sensor_id`
- `location_id`
- `spool_id`, optional
- `material_profile_id`, optional
- `severity`: `info`, `warning`, `critical`
- `metric`: `temperature`, `humidity`, `pressure`, `dew_point`, `sensor`
- `message`
- `recommended_action`
- `is_active`
- `created_at`
- `resolved_at`

#### DryingSession

Represents a drying recommendation or validation session.

Suggested fields:

- `id`
- `spool_id`
- `dryer_location_id`
- `sensor_id`, optional sensor placed in/near dryer
- `target_temp_c`
- `target_duration_hours`
- `started_at`
- `ended_at`
- `status`: `recommended`, `running`, `completed`, `failed`, `cancelled`
- `validation_notes`

## 7. Material Profile Seed Data

These values are initial configurable defaults for the project demo. They must be editable in the frontend and should be replaced by manufacturer-specific values when known.

Use these defaults to make the app practical on day one:

| Material family | Examples / derivatives | Ideal storage RH max | Warning RH max | Critical RH max | Typical room temp target | Drying recommendation seed |
|---|---:|---:|---:|---:|---|---|
| PLA | PLA, PLA+, Silk PLA, Matte PLA, PLA-CF, PLA-GF | 40% | 50% | 60% | 18–30°C | 45°C for 4–6 h |
| PETG / CPE | PETG, PETG-CF, CPE, co-polyesters | 30% | 40% | 50% | 18–30°C | 55–65°C for 4–6 h |
| ABS | ABS, ABS-GF, ABS-CF | 35% | 45% | 55% | 18–30°C | 65–75°C for 4–6 h |
| ASA | ASA, ASA-CF | 35% | 45% | 55% | 18–30°C | 65–75°C for 4–6 h |
| Nylon / PA | PA6, PA12, PA-CF, PA-GF, Nylon blends | 15% | 25% | 35% | 18–30°C | 70–90°C for 8–12 h |
| PC | PC, PC blend, PC-CF | 20% | 30% | 40% | 18–30°C | 80–90°C for 6–8 h |
| TPU / TPE | TPU 95A, TPE, flexible blends | 25% | 35% | 45% | 18–30°C | 50–60°C for 4–8 h |
| PVB | PVB, Polysmooth-style materials | 30% | 40% | 50% | 18–30°C | 55–60°C for 4–6 h |
| PVA | PVA support | 10% | 20% | 30% | 18–30°C | 45–55°C for 4–8 h; store sealed |
| BVOH | BVOH support | 10% | 20% | 30% | 18–30°C | 45–55°C for 4–8 h; store sealed |

Important rules:

1. Manufacturer-specific values override family defaults.
2. Derivatives inherit from parent family unless their profile overrides it.
3. The app must show the source or note for each profile.
4. The app must allow editing thresholds and drying recommendations.
5. The app must warn when the selected dryer cannot reach the recommended drying temperature.

## 8. Environmental Evaluation Rules

### 8.1 Humidity

Humidity is the main readiness metric. For each current reading:

1. Find the active spools assigned to the sensor’s location.
2. Find each spool’s material profile.
3. Compare current `relative_humidity_percent` against the profile thresholds.
4. Create or return an alert per affected spool/material.

Recommended severity:

- `ok`: `RH <= ideal_rh_max_percent`
- `warning`: `ideal_rh_max_percent < RH <= warning_rh_max_percent`
- `critical`: `RH > warning_rh_max_percent` or `RH >= critical_rh_max_percent`

### 8.2 Temperature

Temperature should be tracked because high heat may deform low-temp materials and low temperature near dew point may create condensation risk.

Recommended severity:

- `ok`: within material ideal temp range
- `warning`: outside ideal range but within warning range
- `critical`: outside critical range

### 8.3 Pressure

Atmospheric pressure is recorded for traceability and possible dew point/condensation analysis. Pressure should not usually determine filament readiness by itself. Alert only when:

- sensor value is missing or invalid
- value is outside the sensor’s realistic operating range
- pressure reading suggests a sensor parsing or hardware issue

### 8.4 Dew Point

Backend should compute dew point from temperature and relative humidity when possible. Alert if dew point is close to current temperature, because condensation risk may increase.

A simple rule for MVP:

- `warning` if `temperature_c - dew_point_c <= 3°C`
- `critical` if `temperature_c - dew_point_c <= 1°C`

## 9. Drying Recommendation Rules

When a spool is in `warning` or `critical` humidity status, the dashboard should display a drying recommendation:

- material family
- recommended drying temperature
- recommended minimum and maximum drying time
- dryer capability status
- validation strategy using a sensor

Example:

> P1S-01 / AMS Slot 2 / PETG Orange is above its humidity limit. Dry at 60°C for 4–6 hours. If using Ivation IVFD60RB, verify the dryer can sustain the requested temperature. Place a Dracal sensor near the dryer exhaust or inside a safe monitored area and confirm RH decreases toward the target range before marking the spool ready.

The app must never imply the dehydrator is directly controlled unless a future integration is implemented.

## 10. Sensor Requirements

### 10.1 Sensor Interface

Create a sensor abstraction so the API does not depend directly on hardware.

Example interface:

```python
class SensorReader(Protocol):
    def read_current(self) -> SensorReadingDTO:
        ...
```

Implement at least:

- `MockSensorReader`
- `DracalVcpSensorReader`

Optional:

- `DracalCliSensorReader`

### 10.2 Dracal VCP Reader

The VCP reader should parse Dracal serial lines similar to:

```text
D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5
```

Required parsing result:

- `serial_number`
- `pressure_pa`
- `temperature_c`
- `relative_humidity_percent`
- `raw_payload`

The implementation should handle malformed lines gracefully.

### 10.3 Mock Sensor Reader

Mock sensor behavior must be realistic enough for a demo:

- Values should drift over time instead of being purely random.
- Temperature range should normally stay around 20–32°C.
- Relative humidity should normally stay around 15–60% depending on location profile.
- Pressure should normally stay around 98–103 kPa.
- Occasional controlled excursions should happen so alerts can be demonstrated.
- Each mock sensor should maintain its own state.
- Seed values should be configurable.

Suggested algorithm:

- Use a bounded random walk.
- Add slow sinusoidal daily variation.
- Add rare humidity spikes.
- Clamp values to realistic bounds.

## 11. Required Screens

### 11.1 Main Dashboard

Default landing screen.

Must show:

- current readings per sensor/location
- status cards for temperature, RH, pressure, dew point
- printer or storage location name
- affected spool/material list
- active alerts
- drying recommendations
- timestamp and source mode: `real` or `mock`

### 11.2 Printers & Locations Management

Must allow user to:

- create/edit/delete printers
- select brand/model
- create locations such as AMS, AMS Lite, storage box, dryer, room
- assign a sensor to a location

Initial Bambu Lab models:

- A1 mini
- P1S
- P1P

### 11.3 Filament Profiles Management

Must allow user to:

- view material profiles
- create/edit/delete profiles
- configure humidity thresholds
- configure temperature thresholds
- configure drying temperature and drying time
- define derivative relationship or family notes

### 11.4 Filament Spools & Assignments

Must allow user to:

- create filament spools
- set brand, material type, color, quantity/remaining amount
- assign spool to printer/AMS/storage/dryer location
- view readiness status

### 11.5 History View

Must allow user to:

- choose from/to date-time range
- select sensor, printer, location, or material
- show line chart for temperature, humidity, pressure
- show hourly averages by default
- show raw readings optionally

### 11.6 Drying Validation View

Should allow user to:

- start or record a drying session
- select spool and dryer
- select monitoring sensor
- see target temp/time
- review measured trend while drying
- mark session completed when values are acceptable

## 12. API Endpoints

### 12.1 Required Assignment Endpoints

These must exist exactly as written.

#### GET `/readings/current`

Returns current reading from configured default sensor or selected sensor.

Query parameters:

- `sensor_id`, optional
- `location_id`, optional
- `include_alerts`, optional, default true

Response includes:

- sensor info
- location info
- timestamp
- temperature
- relative humidity
- pressure
- dew point
- source mode
- affected materials/spools
- alerts

#### POST `/readings`

Captures and persists a reading.

MVP behavior:

- If body is empty, read from the default configured sensor and persist it.
- If body includes a manual/mock reading, validate and persist it.

Response:

- saved reading
- created alerts

#### GET `/readings?from=&to=`

Returns readings filtered by time range.

Query parameters:

- `from`, required ISO datetime
- `to`, required ISO datetime
- `sensor_id`, optional
- `location_id`, optional
- `aggregate`, optional: `none`, `hour`

When `aggregate=hour`, return hourly averages for:

- temperature
- relative humidity
- pressure
- dew point

### 12.2 Recommended Extended Endpoints

#### Health

- `GET /health`

#### Sensors

- `GET /sensors`
- `POST /sensors`
- `GET /sensors/{sensor_id}`
- `PATCH /sensors/{sensor_id}`
- `DELETE /sensors/{sensor_id}`

#### Printers

- `GET /printers`
- `POST /printers`
- `GET /printers/{printer_id}`
- `PATCH /printers/{printer_id}`
- `DELETE /printers/{printer_id}`

#### Locations

- `GET /locations`
- `POST /locations`
- `GET /locations/{location_id}`
- `PATCH /locations/{location_id}`
- `DELETE /locations/{location_id}`

#### Materials

- `GET /materials`
- `POST /materials`
- `GET /materials/{material_id}`
- `PATCH /materials/{material_id}`
- `DELETE /materials/{material_id}`

#### Spools

- `GET /spools`
- `POST /spools`
- `GET /spools/{spool_id}`
- `PATCH /spools/{spool_id}`
- `DELETE /spools/{spool_id}`

#### Assignments

- `GET /assignments`
- `POST /assignments`
- `PATCH /assignments/{assignment_id}`
- `DELETE /assignments/{assignment_id}`

#### Alerts

- `GET /alerts`
- `PATCH /alerts/{alert_id}/resolve`

#### Drying

- `GET /drying/recommendations`
- `POST /drying/sessions`
- `GET /drying/sessions`
- `PATCH /drying/sessions/{session_id}`

## 13. Backend Architecture Requirements

### 13.1 Layers

Use a clear separation:

- API routers: request/response and dependency wiring
- Services: business logic and environmental evaluation
- Repositories: database operations
- Models: SQLAlchemy entities
- Schemas: Pydantic request/response models
- Sensors: hardware/mock abstraction

### 13.2 Error Handling

Use consistent errors:

- 400 for invalid user input
- 404 for missing entities
- 422 for validation errors
- 503 when a real sensor is configured but unavailable

### 13.3 Configuration

Use environment variables through Pydantic Settings or equivalent:

```text
APP_ENV=development
DATABASE_URL=sqlite:///./environment_monitor.db
SENSOR_MODE=mock
DRACAL_SERIAL_NUMBER=E25877
DRACAL_VCP_PORT=COM3
MOCK_SENSOR_COUNT=3
CORS_ORIGINS=http://localhost:5173
```

### 13.4 Startup Seed

On first run, seed:

- default material profiles
- 7 printers from the user’s current Bambu Lab access
- one real Dracal sensor entry with serial `E25877`
- a few mock sensors for demo locations
- sample spool assignments

Seed should be idempotent.

## 14. Frontend Architecture Requirements

### 14.1 Pages

Recommended routes:

- `/` Dashboard
- `/history`
- `/printers`
- `/materials`
- `/spools`
- `/drying`
- `/settings`

### 14.2 Components

Suggested components:

- `ReadingCard`
- `SensorStatusGrid`
- `AlertPanel`
- `DryingRecommendationCard`
- `HistoryChart`
- `PrinterForm`
- `MaterialProfileForm`
- `SpoolAssignmentForm`
- `ThemeToggle`

### 14.3 Data Refresh

MVP:

- Poll `/readings/current` every 2–5 seconds.
- Optionally call `POST /readings` every 30–60 seconds to persist history.

Stretch:

- Add WebSocket or Server-Sent Events for live updates.

### 14.4 Theme

- Default: dark mode
- Required: light/dark toggle
- Persist choice in localStorage

## 15. Testing Requirements

### 15.1 Backend Tests

At minimum:

- `GET /readings/current` returns valid mock data
- `POST /readings` persists a reading
- `GET /readings?from=&to=` filters correctly
- hourly aggregation returns expected averages
- alert service flags high humidity per material profile
- Dracal VCP parser handles valid and invalid payloads
- mock sensor values remain within configured bounds

### 15.2 Frontend Tests

Optional for assignment unless time allows, but recommended:

- dashboard renders current reading cards
- theme toggle changes mode
- alert panel renders out-of-range filament warnings

### 15.3 TDD Evidence

Document at least one TDD cycle:

1. Write failing pytest for `GET /readings/current` or Dracal parser.
2. Save screenshot/log of failing test.
3. Implement feature.
4. Save screenshot/log of passing test.
5. Summarize in `EVIDENCE.md`.

## 16. Security Requirements

The app is local, but still validate:

- no arbitrary serial command execution from API input
- no path traversal in file/log handling
- CORS limited to local frontend origin
- request bodies validated by Pydantic
- database operations through SQLAlchemy, not string-concatenated SQL
- sensor port names validated or restricted
- do not store secrets in Git
- no destructive Claude Code shell commands without hook review

The most critical endpoint for security review is `POST /readings`, because it persists user-provided/manual data and may trigger sensor access.

## 17. Documentation Requirements

Required docs:

- `README.md`: setup, backend run, frontend run, tests, sensor mode
- `CLAUDE.md`: Claude Code project context and constraints
- `docs/Requirements.md`: this file
- `docs/Tasks.md`: implementation task list
- `EVIDENCE.md` or `/evidence`: proof of Claude Code usage

At least one domain class should include structured documentation. Since Python does not use XML comments natively, use clear docstrings with XML-like tags or include TSDoc/XML-style comments in a TypeScript domain type to satisfy the spirit of the assignment.

Example:

```python
class MaterialProfile:
    """
    <summary>
    Defines environmental thresholds and drying recommendations for a filament family or manufacturer-specific material.
    </summary>
    """
```

## 18. Claude Code Workflow Requirements

Claude Code must be used intentionally:

1. Use Plan Mode before major implementation.
2. Use Ask Mode for clarifying architectural choices.
3. Initialize or adapt `CLAUDE.md`.
4. Use TDD for at least one feature.
5. Generate and revise documentation.
6. Run a security review prompt.
7. Use GitHub MCP for at least one real action.
8. Use custom skill(s).
9. Use custom hook(s).
10. Use custom subagents when focused work benefits from separate context.

## 19. Acceptance Criteria

The project is acceptable when:

- Backend starts locally.
- Frontend starts locally.
- Dashboard shows current environmental readings.
- Mock mode works without physical hardware.
- Dracal integration is abstracted and can parse VCP-like payloads.
- `GET /readings/current` works.
- `POST /readings` works and persists data.
- `GET /readings?from=&to=` works and supports chart data.
- Tests for required endpoints pass.
- User can configure printers, material profiles, spools, and assignments.
- Alerts identify which printer/location/spool/material is out of range.
- Drying recommendations show temperature and time based on material profile.
- Dark mode is default and light mode is available.
- `CLAUDE.md`, custom skill, custom hook, and evidence are included.

## 20. Suggested Implementation Priority

1. Backend skeleton and tests.
2. Sensor abstraction and mock reader.
3. Required readings endpoints.
4. SQLite persistence and seed data.
5. Basic React dashboard.
6. History chart.
7. Material profiles and alerts.
8. Printer/spool/assignment management.
9. Drying recommendations.
10. Dracal VCP parser and optional real COM port reader.
11. Claude Code evidence cleanup.
12. README and final validation.
