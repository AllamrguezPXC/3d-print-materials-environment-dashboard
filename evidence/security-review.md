# Security Review

Scope: `docs/Requirements.md` §16 (Security Requirements) names `POST /readings`
as the most critical endpoint to review, because it either triggers real
sensor access (empty body) or persists user-supplied manual/mock data (body
present). This review also covers `GET /readings` query validation, the
sensor/serial-port selection path, Pydantic schemas, SQLAlchemy usage, CORS
configuration, secrets handling, and the Claude Code dangerous-command hook.

This app is intentionally local-first, single-user, and unauthenticated
(`docs/Requirements.md` §2.3 non-goals). Findings below do **not** recommend
adding authentication, authorization, or rate limiting, since that would
contradict the stated MVP scope. Only concrete risks within that scope
(injection, validation gaps, unsafe defaults, secrets exposure) are flagged.

## Files reviewed

- `backend/app/api/v1/readings.py`
- `backend/app/schemas/reading.py`
- `backend/app/services/reading_service.py`
- `backend/app/services/environment_service.py` (dew point math used by both read paths)
- `backend/app/repositories/reading_repository.py`
- `backend/app/sensors/dracal_vcp.py`, `backend/app/sensors/factory.py`, `backend/app/sensors/base.py`
- `backend/app/main.py`
- `backend/app/core/config.py`, `.env.example`, `.gitignore`
- `.claude/hooks/guard-dangerous-commands.py`, `.claude/settings.json`

## Findings

| Area | Finding | Severity | Recommendation | Status |
|---|---|---|---|---|
| `POST /readings` — `ReadingCreate` schema (Pydantic) | `temperature_c`, `relative_humidity_percent`, `pressure_pa`, and `pressure_kpa` had no range constraints — only type checking. A manual payload with an out-of-range value (e.g. `temperature_c = -243.12`) can drive the Magnus-formula dew point calculation (`environment_service.compute_dew_point_c`) into a division-by-zero (`b + temperature_c == 0`), producing an unhandled 500 error. Extreme/nonsensical values (RH = -5000, negative pressure) would otherwise also be silently persisted and corrupt history charts/aggregates. | Medium | Add Pydantic `Field(ge=..., le=...)` bounds using physically plausible ranges (wider than the mock sensor's normal demo drift range so warning/critical material-profile scenarios, e.g. RH ~90%, remain valid). | Fixed |
| `POST /readings` — empty-body sensor capture path (`capture_and_persist_reading`) | Real-sensor failures (`SensorParseError`, `OSError`) are caught and converted to `503` as required by §13.2. No unhandled exception path found. | — | None needed. | Accepted-Risk-for-local-MVP (no issue) |
| `POST /readings` — `sensor_id` in manual payload | A client can pass an arbitrary existing `sensor_id`, and the service looks it up with `session.get` and 404s if missing — no injection, but there is no ownership/ACL concept (there is no concept of "ownership" in this single-user local app). Attaching a reading to any known sensor id is expected app behavior, not a vulnerability, given no auth exists by design. | Low | No change; would require authn/authz, out of scope per §2.3. | Accepted-Risk-for-local-MVP |
| `GET /readings` query validation | `from`/`to` are required and parsed via `parse_iso_datetime`, which raises a clean `ValueError` turned into `HTTPException(400)` on malformed input — no unhandled exceptions. `aggregate` is constrained with `Query(..., pattern="^(none|hour)$")`. `sensor_id`/`location_id` are optional typed ints (FastAPI/Pydantic reject non-integers automatically). `to < from` is explicitly rejected with 400. No SQL is built from these values (see repository row below). | — | None needed. | Accepted-Risk-for-local-MVP (no issue) |
| Serial port / sensor selection safety (`dracal_vcp.py`, `factory.py`) | The COM port name (`DRACAL_VCP_PORT`) and expected serial number (`DRACAL_SERIAL_NUMBER`) come only from `Settings` (environment variables loaded once at process start via `get_settings()` / `.env`). No API route, request body, or query parameter can set or influence the port. The reader opens the port directly via `pyserial`'s `serial.Serial(...)` API — there is no shell/subprocess invocation, so no command-injection surface exists. Malformed serial lines are handled gracefully by `parse_vcp_line`, which validates field count, product prefix, unit strings, and numeric parsing, raising `SensorParseError` (never a raw crash) on any mismatch. | — | None needed; this satisfies §16 "no arbitrary serial command execution" and "sensor port names validated or restricted." | Accepted-Risk-for-local-MVP (no issue) |
| Pydantic validation — `source` field spoofing | `ReadingCreate.source` is a `Literal["mock", "manual"]`, so a manual API caller cannot claim `source="real"` and impersonate a hardware-captured reading. Good existing control. | — | None needed. | Accepted-Risk-for-local-MVP (no issue) |
| SQLAlchemy usage (`reading_repository.py`) | All queries use the SQLAlchemy ORM query/filter API (`session.query(...).filter_by(...)`, `and_(...)`) with bound parameters. No raw SQL strings, no string concatenation/formatting into queries anywhere in the reviewed files. | — | None needed. | Accepted-Risk-for-local-MVP (no issue) |
| CORS configuration (`main.py`) | `allow_origins` is restricted to `settings.cors_origin_list` (defaults to `http://localhost:5173`, not a wildcard) — correct per §16. However, `allow_credentials=True` was enabled even though the frontend (`frontend/src/api/client.ts`) never sends cookies or uses `credentials: "include"`, and the app has no session/cookie auth at all. Credentialed CORS is unnecessary here and is a common source of future misconfiguration risk (e.g. if `CORS_ORIGINS` is ever loosened during dev). | Medium | Set `allow_credentials=False` since no cookie/session auth exists in this app. | Fixed |
| `.env` / secrets handling (`config.py`, `.env.example`, `.gitignore`) | `Settings` loads from `.env` via `pydantic-settings`; no secrets/API keys are defined (only local config like `DRACAL_VCP_PORT`, `CORS_ORIGINS`). `.env.example` contains only placeholder/default values, no real secrets. Root `.gitignore` excludes `.env` and `.env.*` (with an explicit `!.env.example` re-inclusion) and also excludes `*.db`/`*.sqlite*`, `__pycache__/`, `.venv/`, `node_modules/`. Confirmed via `git ls-files` that no `.env` or database file is tracked. | — | None needed. | Accepted-Risk-for-local-MVP (no issue) |
| Destructive Claude Code shell command hook (`.claude/hooks/guard-dangerous-commands.py`, `.claude/settings.json`) | The `PreToolUse` hook is wired to the `Bash|PowerShell` matcher in `settings.json` and blocks (`permissionDecision: "deny"`) commands matching destructive patterns (`rm -rf`, `rm -fr`, `rmdir /s`, `del /s`, `Remove-Item -Recurse -Force`, `format <drive>:`, `drop database`, `shutdown`). Confirmed intact and still referenced from `settings.json`. | — | None needed. This satisfies §16 "no destructive Claude Code shell commands without hook review." | Accepted-Risk-for-local-MVP (no issue) |

## Fixes applied

1. **`backend/app/schemas/reading.py`** — Added `Field(ge=..., le=...)` bounds to `ReadingCreate.temperature_c` (`-40..85`), `relative_humidity_percent` (`0..100`), `pressure_pa` (`30000..120000`), and `pressure_kpa` (`30..120`). Bounds are physically plausible for the sensor and its storage environment, wider than the mock sensor's normal demo drift range so material-profile warning/critical demo scenarios (e.g. RH ~90%) remain valid, while rejecting nonsensical input that could otherwise cause a division-by-zero in the Magnus dew-point formula or corrupt stored history.
2. **`backend/app/main.py`** — Changed `CORSMiddleware(allow_credentials=...)` from `True` to `False`, since no part of this app (frontend or otherwise) uses cookie/session credentials, removing unnecessary CORS permissiveness while keeping `allow_origins` restricted to the configured local frontend origin.

## Test verification

Ran the full backend test suite after applying both fixes:

```text
cd backend
./.venv/Scripts/python.exe -m pytest -q
```

Result: **85 passed** (same count as before the review), no failures introduced.

## Summary

No injection vulnerabilities, path traversal, arbitrary command execution,
or tracked secrets were found. The two real gaps — missing numeric bounds on
the manual reading payload, and unnecessary credentialed CORS — have been
fixed in place without touching any of the three required assignment
endpoints' behavior for valid input. All other reviewed areas already met
the `docs/Requirements.md` §16 security requirements and are documented
above as no-issue / accepted risk for this local, single-user MVP.
