# Prompt_Pack.md

# Prompt Pack for Claude Code

Use these prompts from the project root. They are written to make Claude Code use Plan Mode, subagents, skills, hooks, and evidence intentionally.

## Prompt 0 — Initial Audit and Project Alignment

```text
You are working inside the project folder:
C:\Users\AllamRodriguez\Desktop\Programas\3D Print Materials Environment Data Monitoring Dashboard

Before implementing anything, read docs/Requirements.md, docs/Tasks.md, the existing .claude folder, and Inpiration CLAUDE.md.

Goal: create a local React + FastAPI + SQLAlchemy + SQLite + pytest dashboard for live environmental monitoring of 3D printing filament storage/readiness using a Dracal VCP-PTH450-CAL sensor, serial E25877, with mock sensor mode.

First produce a plan only. Do not write or overwrite files yet.

Your plan must include:
1. Which existing .claude agents/hooks/skills are reusable.
2. Which existing files should be archived or adapted.
3. What CLAUDE.md should contain.
4. Backend architecture.
5. Frontend architecture.
6. Required endpoints.
7. TDD cycle proposal.
8. Evidence plan for the 8 Claude Code topics required by the assignment.
```

## Prompt 1 — Create/Adapt CLAUDE.md

```text
Based on docs/Requirements.md, docs/Tasks.md, and Inpiration CLAUDE.md, create the official root CLAUDE.md for this repository.

Constraints:
- Preserve useful ideas from Inpiration CLAUDE.md only if they fit this project.
- Include stack, commands, folder structure, coding conventions, testing requirements, sensor abstraction rules, mock mode rules, and evidence requirements.
- Keep it concise enough for Claude Code to follow consistently.
- Do not include secrets.
- After writing CLAUDE.md, summarize what changed and why.
```

## Prompt 2 — Backend Plan Mode

```text
Enter Plan Mode and design the backend implementation for docs/Requirements.md.

Focus on:
- FastAPI routes
- SQLAlchemy models
- Pydantic schemas
- SensorReader abstraction
- MockSensorReader
- Dracal VCP parser
- readings endpoints
- material profile alert service
- pytest strategy

Return a step-by-step plan and identify the first TDD test to write. Do not implement until I approve.
```

## Prompt 3 — First TDD Cycle

```text
Use a TDD workflow for GET /readings/current.

Steps:
1. Write a pytest that expects GET /readings/current to return temperature_c, relative_humidity_percent, pressure_pa or pressure_kpa, timestamp, sensor metadata, and source=mock.
2. Run the test and confirm it fails.
3. Save the failing output to /evidence/tdd-current-reading-fail.txt.
4. Wait for my approval before implementation.
```

## Prompt 4 — Implement Current Reading Endpoint

```text
Implement the minimum backend code needed to make the failing GET /readings/current test pass.

Constraints:
- Use the SensorReader abstraction.
- Use MockSensorReader by default.
- Keep real Dracal hardware optional.
- Do not implement unrelated CRUD yet.
- Run pytest and save passing output to /evidence/tdd-current-reading-pass.txt.
- Update EVIDENCE.md with the TDD cycle summary.
```

## Prompt 5 — Database and Reading Persistence

```text
Implement SQLAlchemy + SQLite persistence for readings.

Requirements:
- Reading model with timestamp, sensor_id, location_id, temperature_c, relative_humidity_percent, pressure_pa, pressure_kpa, dew_point_c, source, raw_payload.
- POST /readings captures current reading when body is empty.
- POST /readings accepts validated manual/mock reading payload for tests/demo.
- GET /readings?from=&to= filters by time range.
- Support aggregate=hour for hourly averages.
- Add pytest coverage for all behavior.
```

## Prompt 6 — Dracal VCP Parser

```text
Implement a Dracal VCP parser for lines like:
D,VCP-PTH450,E18890,,101182,Pa,24.8344,C,59.8779,%,*3FB5

Requirements:
- Extract product id, serial number, pressure_pa, temperature_c, relative_humidity_percent.
- Validate configured serial E25877 when provided.
- Return a SensorReadingDTO-compatible object.
- Handle malformed lines with clear exceptions.
- Write pytest tests first, including valid payload, malformed payload, and wrong serial.
- Keep mock mode as default.
```

## Prompt 7 — Material Profiles and Alerts

```text
Implement material profiles and environmental alert logic using docs/Requirements.md as source of truth.

Requirements:
- Seed editable profiles for PLA, PETG/CPE, ABS, ASA, Nylon/PA, PC, TPU/TPE, PVB, PVA, BVOH.
- Evaluate humidity and temperature per active spool assignment.
- Compute dew point and condensation warning.
- Return affected printer/location/spool/material in GET /readings/current.
- Persist alerts when POST /readings saves a violating reading.
- Add tests for ok, warning, and critical humidity cases.
```

## Prompt 8 — Frontend Dashboard

```text
Build the React dashboard for the current reading workflow.

Requirements:
- Dark mode by default.
- Light/dark toggle persisted in localStorage.
- Poll GET /readings/current every 2–5 seconds.
- Show cards for temperature, humidity, pressure, dew point.
- Show sensor, printer/location, source mode, and timestamp.
- Show active alerts and drying recommendations.
- Add loading and error states.
- Keep components clean and reusable.
```

## Prompt 9 — History Page

```text
Build the history page.

Requirements:
- Date-time range selectors.
- Sensor/location filters if endpoints are ready.
- Fetch GET /readings?from=&to=&aggregate=hour.
- Render Recharts or Chart.js line charts for temperature, humidity, and pressure.
- Add empty state and error state.
- Add a button to POST /readings to manually capture a reading for demo history.
```

## Prompt 10 — Configuration UI

```text
Build configuration screens for printers, locations, material profiles, spools, and assignments.

Requirements:
- Users can add/edit Bambu Lab printers: A1 mini, P1S, P1P and future models.
- Users can add/edit filament material profiles and thresholds.
- Users can add spools with color, brand, material, and quantity.
- Users can assign spools to AMS slots, storage boxes, dryers, or printer external spool locations.
- Show validation errors clearly.
```

## Prompt 11 — Drying Recommendations

```text
Implement drying recommendations and drying session tracking.

Requirements:
- For each warning/critical spool, show material-specific drying temp/time.
- Include the configured dryer capability check.
- Support Ivation IVFD60RB as a dryer profile, with editable max temperature and notes.
- Warn if recommended drying temperature exceeds dryer capability.
- Allow a second Dracal sensor to validate dryer environment in the future.
- Do not claim that the app controls the dryer.
```

## Prompt 12 — Security Review

```text
Act as a security reviewer.

Review:
- POST /readings
- GET /readings query validation
- sensor selection and serial port handling
- database persistence
- CORS settings
- .env handling
- Claude Code hooks

Create /evidence/security-review.md with findings, severity, recommendation, and status. Then update EVIDENCE.md.
```

## Prompt 13 — GitHub MCP Evidence

```text
Use GitHub MCP for one real repository action.

Preferred action:
- Create an issue titled "Implement required readings endpoints".
- Include acceptance criteria from docs/Requirements.md.

After the MCP action, update EVIDENCE.md with:
- date/time
- action performed
- issue/PR/commit reference
- why it satisfies the assignment requirement.
```

## Prompt 14 — Final Submission Check

```text
Perform a final submission review.

Check:
- Backend runs.
- Frontend runs.
- GET /readings/current works.
- POST /readings works.
- GET /readings?from=&to= works.
- pytest passes.
- Dashboard consumes endpoints.
- Mock mode works without hardware.
- CLAUDE.md exists.
- Custom skill exists.
- Custom hook exists.
- Evidence exists for all 8 Claude Code topics.
- README.md has clear instructions.

Then produce a final checklist in EVIDENCE.md and tell me what remains incomplete, if anything.
```
