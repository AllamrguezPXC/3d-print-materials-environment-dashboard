# Final Assignment Compliance Checklist

Source document: `docs/asignacion_react_fastapi.pdf` ("Dashboard de Monitoreo Ambiental en Tiempo
Real" — Phoenix Calibration DR). This checklist maps every literal requirement in that document to
its evidence in this repository. Generated/verified 2026-07-14 as part of the final delivery
review — see `EVIDENCE.md`'s "Final Assignment Compliance Review" section for the audit narrative.

Legend: ✅ Cumplido · 🟡 Parcial · ❌ Pendiente

## 1. Stack requerido

| Requisito | Estado | Evidencia | Notas |
|---|---|---|---|
| React (frontend) | ✅ | `frontend/` — React 19 + TypeScript + Vite | `frontend/package.json` |
| FastAPI (backend) | ✅ | `backend/app/main.py`, `backend/app/api/v1/*.py` | |
| SQLAlchemy | ✅ | `backend/app/models/*.py`, `backend/app/db/session.py` | SQLAlchemy 2.x, declarative `Mapped[...]` style |
| SQLite | ✅ | `backend/environment_monitor.db` (gitignored, generated on first run), `database_url` in `backend/app/core/config.py` | WAL mode + FK enforcement enabled (`backend/app/db/session.py`) |
| pytest | ✅ | `backend/tests/` — 170 tests | `cd backend && pytest -q` |
| Sensor Dracal (temp/humedad/presión) | ✅ | `backend/app/sensors/dracal_vcp.py` (VCP serial parser), `dracal_cli.py` (USB CLI variant for devices without a virtual COM port) | Both real-hardware paths implemented and tested with mocked I/O (no hardware dependency in CI) |
| Modo mock / sensor simulado | ✅ | `backend/app/sensors/mock.py` — bounded random-walk + daily sinusoid, seeded per-sensor | Sensors are configured per-row (`sensor_type`), not a single global mode — see `CLAUDE.md`'s Backend Conventions |
| Sensor abstraído detrás de una interfaz | ✅ | `backend/app/sensors/base.py` (`SensorReader` protocol), `backend/app/sensors/factory.py` (`get_sensor_reader_for_sensor`) | Routes never touch hardware directly — confirmed via `evidence/security-review.md` |

## 2. Casos de uso obligatorios

| # | Caso de uso | Endpoint | Estado | Evidencia | Comando de validación |
|---|---|---|---|---|---|
| 1 | Capturar lectura actual del sensor | `GET /readings/current` | ✅ | `backend/app/api/v1/readings.py`, `backend/app/services/environment_service.py`; tested in `backend/tests/api/test_readings_current.py`; frontend consumes via `frontend/src/api/readings.ts` → `Dashboard.tsx` (live-polled, `refetchInterval`) | `curl http://localhost:8000/readings/current` |
| 2 | Guardar lectura en historial | `POST /readings` | ✅ | `backend/app/services/reading_service.py` (`persist_manual_reading`, `capture_and_persist_all_active_sensors`), persists via SQLAlchemy to SQLite with `timestamp`; tested in `backend/tests/api/test_readings_post.py`; frontend "Capture reading now" button in `History.tsx` | `curl -X POST http://localhost:8000/readings` |
| 3 | Consultar historial por rango de tiempo | `GET /readings?from=&to=` | ✅ | `backend/app/services/reading_service.py::get_readings_history`; tested in `backend/tests/api/test_readings_history.py`; frontend `History.tsx` renders hourly-aggregated line charts via **Recharts** (`components/HistoryChart.tsx`) | `curl "http://localhost:8000/readings?from=...&to=..."` |

All three endpoints also re-verified live (fresh `curl` calls) during this review — see
`EVIDENCE.md`.

## 3. Temas de Claude Code requeridos (40% del peso de evaluación)

| # | Tema | Origen | Estado | Evidencia | Notas |
|---|---|---|---|---|---|
| 1 | Plan Mode + Ask Mode | Curso 1 | ✅ | `EVIDENCE.md` — "Plan Mode / Ask Mode" section, plus every subsequent phase in `docs/Tasks.md` that used Plan Mode before non-trivial work (e.g. "Sensor Per AMS Module," "Dashboard Device-Module Visual Redesign," the multi-round dashboard-admin-controls tasks); `AskUserQuestion` used repeatedly for scope/priority decisions | Plan files themselves live under `~/.claude/plans/` per-session (not repo-tracked by design), but every plan's *outcome* and the decision points are narrated in `EVIDENCE.md`/`docs/Tareas/*/TASK.md` |
| 2 | `/init` y `CLAUDE.md` | Curso 1 | ✅ | Root `CLAUDE.md` — contains project context, required endpoints, stack, backend/frontend conventions, domain rules, task-documentation rules, git workflow, testing requirements/commands, evidence requirements, Claude Code operating rules, recommended subagents/skills | Kept in sync with the actual repo structure across ~30 build phases |
| 3 | Test-driven Iteration | Curso 1 | ✅ | `evidence/tdd-current-reading-fail.txt` (failing test, route didn't exist) → `evidence/tdd-current-reading-pass.txt` (passing, after implementing `GET /readings/current`); narrated step-by-step in `EVIDENCE.md`'s "TDD Cycle" section | Directly on the assignment's own example endpoint |
| 4 | Documentation Guidelines | Curso 1 | ✅ | Root `README.md` (this review refreshed it); domain-class docstring on `MaterialProfile` (`backend/app/models/material_profile.py`, structured `<summary>` docstring) | "XML comments" adapted to Python docstrings, as this is a Python/React stack, not C# |
| 5 | Security | Curso 1 | ✅ | `evidence/security-review.md` — full review of `POST /readings` (the assignment's own most-critical-endpoint candidate) plus CORS/secrets/serial-port safety; 2 findings fixed (numeric bounds, `allow_credentials`). Extended by a second, later security pass during the final bug-sweep task (`docs/Final_Review_Bug_Sweep_Guide.md`) covering the newer `auto_capture.py` background loop and FK-integrity gaps | Two complementary reviews, not duplicates — the first is endpoint-scoped per the assignment's literal ask, the second covers code added afterward |
| 6 | GitHub MCP Integration | Curso 2 | ✅ | The project-path drive-letter casing mismatch (see previous review) was fixed directly in `~/.claude.json` and the session restarted — the `github` MCP server is now connected and authenticated (`mcp__github__get_me` → `AllamrguezPXC`). Live MCP actions taken against this repo: `mcp__github__pull_request_read` (fetched PR #2's full metadata) and `mcp__github__list_commits` (fetched the 3 most recent `main` commits, including this checklist's own commit `c1a7316`). A write action (`mcp__github__add_issue_comment` on PR #2) was also attempted as evidence but was rejected with `403 Resource not accessible by personal access token` — the configured PAT is read-scoped only | Upgraded from 🟡 Parcial to ✅ — this is now a literal MCP-driven action, not just the `gh` CLI substitute (Issue #1, PR #2) documented in the prior review. The 403 on the write attempt is a token-scope limitation, not a connectivity failure; read-only MCP actions fully satisfy this theme, and the `gh` CLI substitute remains available for any write action if needed |
| 7 | Custom Skill | Curso 2 | ✅ | `.claude/skills/` — 6 skills, each with its own `SKILL.md`: `fastapi-endpoint-builder`, `react-chart-dashboard`, `material-profile-manager`, `pytest-tdd-cycle`, `evidence-capture`, `context-handoff` | `fastapi-endpoint-builder` was used directly to build `GET /readings/current` (see `EVIDENCE.md`) |
| 8 | Custom Hook | Curso 2 | ✅ | `.claude/hooks/guard-dangerous-commands.py` (blocks destructive shell commands pre-execution), `evidence-logger.py` (logs every tool operation to `evidence/claude-code-operations.jsonl`), `quality-frontend.py` (runs this project's own `oxlint` after a frontend file edit), `pre-compact-context-handoff.py` (auto-saves a context handoff before compaction) | All wired into `.claude/settings.json`; each has a docstring explaining its purpose |

## 4. Entregables

| Entregable | Estado | Evidencia |
|---|---|---|
| Código fuente completo | ✅ | `backend/`, `frontend/` |
| Backend FastAPI + SQLAlchemy + SQLite + módulo sensor Dracal con modo mock | ✅ | See §1 above |
| Frontend React con dashboard que consume los 3 endpoints | ✅ | `frontend/src/pages/Dashboard.tsx`, `History.tsx` |
| Los 3 casos de uso funcionales con tests pytest | ✅ | See §2 above |
| `CLAUDE.md` en la raíz | ✅ | `/CLAUDE.md` |
| `README.md` con instrucciones claras | ✅ | `/README.md` (setup, env vars, mock/Dracal config, test commands, endpoints, structure) |
| `EVIDENCE.md` (o `/evidence`) | ✅ | Both exist — `/EVIDENCE.md` (checklist + narrative) and `/evidence/` (raw artifacts: TDD logs, security review, screenshots, operations log) |
| Ciclo TDD: prueba fallida + implementación + prueba pasando | ✅ | `evidence/tdd-current-reading-fail.txt`, `evidence/tdd-current-reading-pass.txt` |
| Archivo del Custom Skill | ✅ | `.claude/skills/*/SKILL.md` (6 files) |
| Archivo del Hook con comentarios | ✅ | `.claude/hooks/*.py` (each has a docstring header naming its event, purpose) |

## 5. Criterios de evaluación

| Criterio | Peso | Estado | Justificación |
|---|---|---|---|
| Funcionalidad | 30% | ✅ | 3 endpoints respond correctly (re-verified live), 170 backend + 160 frontend tests pass, frontend consumes backend, dashboard shows live values, history + line chart work |
| Uso de Claude Code | 40% | ✅ (8/8) | See §3 — every theme has concrete, inspectable evidence in the repo, including a live GitHub MCP action (theme 6, upgraded from documented-substitute during this review) |
| Arquitectura y calidad | 20% | ✅ | Backend: routers (thin) → services (business logic) → repositories/models; sensor abstraction (`SensorReader` protocol + factory) fully decouples routes from hardware; frontend: `api/` → `hooks/` → `pages/`/`components/`; no dead/duplicated logic found in the final bug-sweep audit (see `docs/Final_Review_Bug_Sweep_Guide.md`) |
| Skill y Hook | 10% | ✅ | 6 skills + 4 active hooks, all functional and documented; this review adapted one hook to the project's actual linter and removed 3 that were unwired/redundant |

## Comandos de validación (ejecutados 2026-07-14)

```bash
cd backend && pytest -q
# 170 passed

cd frontend
npx tsc -b            # clean
npm run build          # clean (pre-existing >500kB chunk-size notice, not an error)
npm run lint            # clean (6 pre-existing warnings, no errors)
npx vitest run          # 160 passed, 28 files
```

`ruff`/`mypy` were not run — neither is configured anywhere in this project (no config file, not in
`backend/requirements.txt`).

## Limitaciones conocidas

- **GitHub MCP write scope**: the connected `github` MCP server's PAT is read-only — a live
  `mcp__github__add_issue_comment` call on PR #2 was rejected with a 403 during this review. Read
  actions (`get_me`, `pull_request_read`, `list_commits`) work and were used as evidence; the `gh`
  CLI remains available for any write action against this repo if one is needed later.
- No Alembic/migration tool — schema changes require recreating the local dev SQLite database
  (documented in `README.md`).
- The project's actual scope is substantially larger than the assignment's minimum 3-endpoint ask
  (printers, spools, materials, alerts, drying recommendations, dashboard filters, etc.). This is
  intentional and does not reduce compliance — the assignment's own "Nota Importante" states scope
  is secondary to Claude Code workflow evidence — but it does mean an evaluator skimming only for
  the 3 required endpoints should look at `backend/app/api/v1/readings.py` specifically, not the
  full API surface.
