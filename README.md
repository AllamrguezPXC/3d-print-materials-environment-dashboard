# 3D Print Materials Environment Data Monitoring Dashboard

A local full-stack web application for live environmental monitoring of 3D-printing filament
storage and readiness — temperature, relative humidity, atmospheric pressure, and dew point —
using a Dracal `VCP-PTH450-CAL` sensor (serial `E27297`), alongside independently-simulated mock
sensors (seeded by default) so the app runs fully without hardware.

See `docs/Requirements.md` for the full specification and `docs/Tasks.md` for the implementation
checklist. `CLAUDE.md` documents the Claude Code conventions used to build this repo, and
`EVIDENCE.md` / `evidence/` document that Claude Code workflow (Plan Mode, TDD, security review,
custom skills/hooks, GitHub integration).

New to this repo? Start with
[`docs/Guia_Incorporacion_Desarrollador.md`](docs/Guia_Incorporacion_Desarrollador.md) (Spanish) —
a progressive onboarding walkthrough of the whole stack, architecture, and day-to-day workflow.

## Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.x, SQLite, Pydantic v2, pytest
- **Frontend**: React 19, TypeScript, Vite, React Router, Tailwind CSS v4, shadcn/ui (Radix UI),
  TanStack Query, Recharts, lucide-react — see `docs/Frontend_Redesign_Guide.md` for the full
  rationale behind this stack and the architecture it produced.

## Setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\pip install -r requirements.txt
# macOS/Linux:
# .venv/bin/pip install -r requirements.txt

copy ..\.env.example .env   # Windows; cp ../.env.example .env on macOS/Linux — optional, defaults work out of the box

.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `http://localhost:8000/docs`).
On first run it creates `backend/environment_monitor.db` (SQLite) and seeds default material
profiles, 7 Bambu Lab printers, the real Dracal sensor record (serial `E27297`), a few
independently-simulated mock sensors/locations (serials `MOCK-0001`, `MOCK-0002`, ...), a full
4-slot AMS demo on `P1S #1`, and demo filament spools — safe to restart repeatedly (seeding is
idempotent). If you're updating from an older clone, delete `backend/environment_monitor.db` before
restarting `uvicorn` — this project has no migration tool, so schema changes require a fresh DB.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard is now at `http://localhost:5173`. Copy `frontend/.env.example` to `.env` to point
at a non-default backend URL (`VITE_API_BASE_URL`, defaults to `http://localhost:8000`).

### Tests

```bash
cd backend
.venv\Scripts\python -m pytest -q
```

170+ tests cover the three required endpoints, the sensor abstraction (mock drift/bounds, Dracal
VCP parser, per-sensor factory), material profile alert evaluation (including threshold-ordering
validation), drying recommendations, serial port detection/test-read (mocked, no real hardware
dependency), foreign-key existence/integrity checks, and CRUD for every entity.

```bash
cd frontend
npx tsc -b          # type-check
npm run build       # production build
npm run lint        # oxlint
npx vitest run       # 160+ tests (or: npm run test)
```

## Sensors

Sensors are configured per-row in the `sensors` table (`GET/POST/PATCH/DELETE /sensors`) — there
is no global sensor mode. Each row picks its own implementation via `sensor_type`:

- `mock` — a bounded random-walk simulator with a slow daily sinusoid and rare excursions, seeded
  independently per sensor (from its own serial number) so multiple mock sensors never move in
  lockstep. Mock sensors must use a `MOCK-`-prefixed serial and may never use the real hardware
  serial `E27297`; both rules are enforced on create/update. Seeded mock sensors are active by
  default so the app always runs without hardware.
- `dracal_vcp` — reads real Dracal VCP-PTH450 serial lines over the sensor row's own `port` (e.g.
  `COM3`) and validates against its own `serial_number` (e.g. `E27297`). Requires a non-empty
  `port`, enforced on create/update.
- `dracal_cli` — reads a real Dracal USB sensor via the vendor's `dracal-usb-get` CLI tool instead
  of a virtual COM port, for devices whose Windows driver binds to the generic USB class rather
  than CDC/VCP (so no serial port is ever exposed). Identifies its device via `serial_number` only
  — no `port` required. Configure the CLI tool's location once via `DRACAL_CLI_EXECUTABLE` if it
  isn't on `PATH`.

`GET /readings/current` returns one entry per active sensor (see the endpoint table below) — a
failing physical sensor's error is isolated to its own entry and never blocks the others or
invents a fallback reading.

## Required assignment endpoints

These three endpoints are mandatory and are covered by pytest:

| Endpoint | Purpose |
|---|---|
| `GET /readings/current` | One reading (or read error) per active sensor, each with location metadata, dew point, and transient alerts |
| `POST /readings` | Capture-and-persist from every active sensor (empty body), or persist a validated manual/mock reading (body present) |
| `GET /readings?from=&to=` | Historical readings, optionally `aggregate=hour` for hourly averages |

Extended REST endpoints exist for sensors (including `GET /sensors/ports` serial-port detection and
`POST /sensors/{id}/test-read`), printers, locations (including AMS `slot_index`), materials,
spools, assignments, alerts, and drying recommendations/sessions — see `http://localhost:8000/docs`
once running.

## Dashboard features

Beyond live readings, the Dashboard (`/`) groups sensors into per-printer/per-location device
modules and supports configuring the following directly from the cards — every change is mirrored
1:1 on `/printers` and `/sensors`:

- **Printer operational status** (activo/inactivo/mantenimiento, color-coded) — administrative
  only, never suppresses real alerts.
- **Sensor assignment/reassignment**, including creating a brand-new sensor inline.
- **Filament-system-type switching** (AMS ↔ External Spool ↔ both at once via the
  `ams_external_spool` hybrid type).
- **Filters** (search, alert/sensor/slot status, printer brand/status, filament type/brand/color/
  status) that persist across page reloads (`Settings` has a "Reset filters" button).
- A global **notification-bell** popover (top-right, on every page) showing the same live alerts
  as the Dashboard, with the affected printer/AMS-slot/location named on each one.

A background auto-capture loop (`AUTO_CAPTURE_INTERVAL_SECONDS` in `.env`, default 30s) persists a
Reading from every active sensor periodically, so `/alerts` and `/history` accumulate real data
without needing to manually click "Capture reading now."

See `docs/Tasks.md` for the full phase-by-phase build history and `docs/*_Guide.md` for detailed
write-ups of each feature.

## Project structure

```
backend/app/
  api/v1/        FastAPI routers (thin — validation + delegation only)
  services/      business logic (alert evaluation, drying recommendations, reading capture)
  repositories/  SQLAlchemy query helpers
  models/        SQLAlchemy ORM models
  schemas/       Pydantic request/response models
  sensors/       SensorReader abstraction: mock, Dracal VCP parser, factory
  db/            engine/session setup + idempotent startup seed
frontend/src/
  api/             typed fetch client + per-resource wrappers
  components/ui/   shadcn/ui primitives (Button, Card, Badge, Select, Dialog, Table, ...)
  components/      app-specific UI (StatusBadge, forms, panels, charts, layout, theme toggle)
  pages/           one file per route (Dashboard, History, Printers, PrinterDetail, Materials,
                   Spools, Sensors, Drying, Settings)
  hooks/           useTheme, useNotice, useRefreshInterval, useResource + hooks/resources/*
  lib/             cn() helper, status-variant map, TanStack Query client
  types/           TypeScript interfaces mirroring backend schemas
```

See `docs/Frontend_Redesign_Guide.md` for the full frontend architecture, design-token system, and
component-extension guide.

## Claude Code evidence

See `EVIDENCE.md` for the full checklist and `evidence/` for TDD logs, the security review, and
Playwright MCP browser-verification screenshots.
