# CLAUDE.md

# 3D Print Materials Environment Data Monitoring Dashboard

## Project Context

This repository is a local full-stack web application for live environmental monitoring of 3D printing filament storage/readiness.

The project must demonstrate effective use of Claude Code for the assignment "Dashboard de Monitoreo Ambiental en Tiempo Real" using:

- React frontend
- FastAPI backend
- SQLAlchemy
- SQLite
- pytest
- Dracal environmental sensor abstraction
- mock sensor mode
- custom Claude Code skills
- custom Claude Code hooks
- custom Claude Code subagents
- documented evidence of Claude Code workflow

Primary hardware target:

- Dracal `VCP-PTH450-CAL`
- Serial number `E25877`
- Measures temperature, relative humidity, and atmospheric pressure

Initial printer context:

- 4 × Bambu Lab A1 mini
- 2 × Bambu Lab P1S
- 1 × Bambu Lab P1P

## Required Assignment Endpoints

These endpoints are mandatory and must remain functional:

- `GET /readings/current`
- `POST /readings`
- `GET /readings?from=&to=`

Do not break these endpoints while adding extended features.

## Development Priorities

1. Keep mock mode working at all times.
2. Build the required endpoints before optional features.
3. Use tests for every core backend behavior.
4. Keep hardware-specific code behind a sensor abstraction.
5. Make material thresholds editable, not hard-coded as permanent truth.
6. Keep the app local-first and simple.
7. Maintain evidence of Claude Code usage.

## Backend Conventions

- Use Python 3.11+.
- Use FastAPI routers under `backend/app/api/v1/`.
- Use SQLAlchemy models under `backend/app/models/`.
- Use Pydantic schemas under `backend/app/schemas/`.
- Use services for business logic under `backend/app/services/`.
- Use sensor classes under `backend/app/sensors/`.
- Use pytest under `backend/tests/`.
- Do not let API routes contain complex business logic.
- Do not access Dracal hardware directly from routes.
- Default `SENSOR_MODE` must be `mock`.

## Frontend Conventions

- Use React with TypeScript.
- Use dark mode by default.
- Persist theme in localStorage.
- Keep API calls in `frontend/src/api/`.
- Keep reusable components in `frontend/src/components/`.
- Use Recharts or Chart.js for history charts.
- Main dashboard must prioritize live readings, alerts, affected printer/location/spool, and drying recommendations.

## Domain Rules

- Humidity is the primary filament readiness metric.
- Temperature matters for deformation and condensation risk.
- Pressure is recorded for traceability and sensor context, but should not normally mark filament as unusable by itself.
- Dew point should be computed when possible.
- Material profiles must be editable.
- Manufacturer-specific material profiles override generic family defaults.
- Drying recommendations are advisory only. The app does not control the dryer.

## Task Documentation

Before implementing any non-trivial feature, fix, refactor, or test task, create a task folder:

```
docs/Tareas/<kebab-case-task-name>/TASK.md
```

`TASK.md` must contain: Objective, Context, Scope, Files & Modules Involved, Implementation Steps,
Validation Steps, and a Completion Criteria checklist. Update the checklist as items finish — all
boxes must be checked before the task is considered done. Skip this for genuinely trivial edits
(typo fixes, one-line changes).

## Git Workflow

- Branch naming: `<base-branch>-feature|fix|test|refactor/<task-folder-name>` (matches the
  `docs/Tareas/` folder name for that task).
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Do not open a pull request until the user has validated the change in the browser (dashboard)
  or via a passing test run for backend-only changes — ask for validation, then wait for confirmation.
- Merge only into the branch this task's branch was created from. Never assume `main` — ask if unclear.

## Testing Requirements

Before marking any task complete:

1. Write tests for new backend behavior (pytest) and, where practical, frontend behavior.
2. Run the full relevant suite — `cd backend && pytest` and/or `cd frontend && npx vitest run`.
3. If tests fail, fix the implementation (not the test) unless the test itself is wrong.
4. Re-run until green before considering the task done.
5. For UI changes, also do a real browser check (see Playwright MCP below) — passing tests alone
   do not confirm the feature works end-to-end.

## Browser Verification (Playwright MCP)

Playwright MCP tools (`mcp__playwright__browser_navigate`, `browser_snapshot`,
`browser_take_screenshot`, `browser_click`, etc.) are available in this session. Use them to
smoke-test the running dashboard (`npm run dev`) after frontend changes — navigate to the page,
snapshot/screenshot to confirm cards/alerts/charts render, and exercise at least the theme toggle
and one form — as a complement to, not a replacement for, `pytest`/`vitest`.

## Testing Commands

Backend:

```bash
cd backend
pytest
```

Backend dev server:

```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Evidence Requirements

Maintain `EVIDENCE.md` and/or files under `/evidence` showing:

1. Plan Mode + Ask Mode
2. `/init` and `CLAUDE.md`
3. TDD cycle: failing test → implementation → passing test
4. Documentation generation
5. Security review
6. GitHub MCP action
7. Custom Skill
8. Custom Hook

## Claude Code Operating Rules

- Use Plan Mode before implementing non-trivial features.
- Ask for approval before overwriting existing `.claude` files from another project.
- Prefer small, testable commits.
- Run relevant tests after backend changes.
- Update documentation when behavior changes.
- Update evidence after Claude Code workflow milestones.
- Never commit `.env`, local SQLite databases, node_modules, Python caches, or secrets.
- No GitHub MCP server is connected in this environment. Use the `gh` CLI (already installed and
  authenticated) for repository actions — issues, commits, PRs — and document it in `EVIDENCE.md`
  as satisfying the GitHub-integration requirement in spirit, noting the tool actually used.

## Recommended Subagents

Use project subagents when useful:

- `backend-fastapi-architect`
- `sensor-integration-specialist`
- `frontend-react-dashboard`
- `qa-tdd-engineer`
- `security-reviewer`
- `docs-evidence-curator`
- `materials-domain-specialist`
- `context-handoff-specialist` — generates a context handoff document before compaction or on
  manual request (`/context-handoff`); see `.claude/context-handoffs/README.md`.

## Recommended Skills

Use project skills when useful:

- `/fastapi-endpoint-builder`
- `/react-chart-dashboard`
- `/material-profile-manager`
- `/pytest-tdd-cycle`
- `/evidence-capture`
- `/context-handoff` — manual context-handoff checkpoint; also fires automatically via the
  `PreCompact` hook before context compaction.

## Important Constraint

The assignment values evidence of Claude Code usage more than building an oversized perfect system. Keep the MVP focused, functional, tested, and well-documented.
