# 3D Print Materials Environment Data Monitoring Dashboard

A local full-stack web application for live environmental monitoring of 3D-printing filament
storage and readiness — temperature, relative humidity, atmospheric pressure, and dew point —
using a Dracal `VCP-PTH450-CAL` sensor (serial `E25877`), with a realistic mock sensor mode
enabled by default so the app runs fully without hardware.

See `docs/Requirements.md` for the full specification and `docs/Tasks.md` for the implementation
checklist. `CLAUDE.md` documents the Claude Code conventions used to build this repo, and
`EVIDENCE.md` / `evidence/` document that Claude Code workflow (Plan Mode, TDD, security review,
custom skills/hooks, GitHub integration).

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
profiles, 7 Bambu Lab printers, the real Dracal sensor record (serial `E25877`), a few mock
sensors/locations, and demo filament spools — safe to restart repeatedly (seeding is idempotent).

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

87+ tests cover the three required endpoints, the sensor abstraction (mock drift/bounds, Dracal
VCP parser), material profile alert evaluation, drying recommendations, and CRUD for every entity.

## Sensor modes

`SENSOR_MODE` (backend env var, default `mock`) selects the sensor implementation:

- `mock` — a bounded random-walk simulator with a slow daily sinusoid and rare excursions, so
  alerts can be demonstrated without hardware. This is the default and must always work.
- `dracal_vcp` — reads real Dracal VCP-PTH450 serial lines over a COM port
  (`DRACAL_VCP_PORT`, e.g. `COM3`) and validates against `DRACAL_SERIAL_NUMBER` (default `E25877`).

## Required assignment endpoints

These three endpoints are mandatory and are covered by pytest:

| Endpoint | Purpose |
|---|---|
| `GET /readings/current` | Current environmental reading, sensor/location metadata, dew point, transient alerts |
| `POST /readings` | Capture-and-persist from the configured sensor (empty body), or persist a validated manual/mock reading (body present) |
| `GET /readings?from=&to=` | Historical readings, optionally `aggregate=hour` for hourly averages |

Extended REST endpoints exist for sensors, printers, locations, materials, spools, assignments,
alerts, and drying recommendations/sessions — see `http://localhost:8000/docs` once running.

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
  pages/           one file per route (Dashboard, History, Printers, Materials, Spools, Drying, Settings)
  hooks/           useTheme, useNotice, useRefreshInterval, useResource + hooks/resources/*
  lib/             cn() helper, status-variant map, TanStack Query client
  types/           TypeScript interfaces mirroring backend schemas
```

See `docs/Frontend_Redesign_Guide.md` for the full frontend architecture, design-token system, and
component-extension guide.

## Claude Code evidence

See `EVIDENCE.md` for the full checklist and `evidence/` for TDD logs, the security review, and
Playwright MCP browser-verification screenshots.
