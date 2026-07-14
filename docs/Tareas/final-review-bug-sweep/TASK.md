# Final review: full-stack bug sweep before marking the project complete

## Objective

One last thorough pass before treating the project as done: find and fix any real bugs across the
full stack, identify (without necessarily implementing) further improvement opportunities with
concrete tools/approaches, and re-validate everything in the browser.

## Context

The user had already validated the dashboard admin-controls work themselves and asked for a final
review pass: find bugs first and fix them properly, then separately note improvement points
(backend and frontend) with what tools could address them, and if everything checks out, move to
final validation/completion.

Three specialized subagents (`backend-fastapi-architect`, `frontend-react-dashboard`,
`security-reviewer`) ran in parallel, each doing a read-only audit of their area, while live
Playwright browser testing (every page, theme toggle, console errors) and direct `curl`
probing of edge cases (invalid payloads, nonexistent foreign keys) ran alongside. Findings were
cross-checked against the actual code before being treated as real (not every subagent
observation survived verification).

## Scope

**Confirmed bugs fixed (in scope):**
1. `MaterialProfile` create/update accepted internally inconsistent thresholds (e.g.
   `ideal_rh_max_percent > critical_rh_max_percent`, inverted temp ranges, inverted drying-time
   range) with no validation — this silently breaks `alert_service.evaluate_humidity_severity`/
   `evaluate_temperature_severity`'s severity comparisons for that material.
2. SQLite foreign-key constraints were never enforced (no `PRAGMA foreign_keys=ON`) — every
   model's `ForeignKey(...)` column was decorative only. Confirmed by reproduction: deleting a
   `Location` referenced by an active `SpoolAssignment` succeeded silently instead of the
   advertised 400, leaving the assignment's `location_id` dangling.
3. Several create/update endpoints never checked that a referenced foreign key actually existed
   before persisting: `Sensor.location_id`, `SpoolAssignment.spool_id`/`location_id`,
   `FilamentSpool.material_profile_id`, `Location.printer_id`. Confirmed by reproduction:
   `POST /assignments {"spool_id": 999999, "location_id": 888888}` returned 200 and created a
   permanently-dangling row.
4. `reading_service.get_readings_history`'s hourly dew-point average divided by every reading in
   the bucket (`len(bucket)`) instead of only the readings that actually had a non-null
   `dew_point_c`, silently biasing the average toward zero whenever a bucket had a mix. Currently
   latent (no live write path leaves `dew_point_c` null), fixed as a correctness issue regardless.
5. Frontend: `useCreateSensor`/`useUpdateSensor`/`useCreateAssignment`/`useUpdateAssignment` never
   invalidated the `["current-reading"]` query, so a Dashboard card assigning/reassigning a sensor
   or spool stayed stale until the next poll tick (up to the user's configured refresh interval).
6. Frontend: `History.tsx` rendered "No readings in this range yet" before the user had ever
   clicked "Load history" (the query is `enabled: false`), indistinguishable from a genuinely
   empty result.

**Improvement opportunities identified, documented, NOT implemented** (per explicit scope —
report + name the tool, don't build): route-based code splitting (`React.lazy`) for the ~880kB
main JS chunk; missing DB indexes on hot-path filter columns (`Sensor.is_active`,
`SpoolAssignment.location_id`/`is_active`, `Alert.is_active`/`severity`, composite
`Location(printer_id, location_type)`); `get_affected_spools` computed twice per sensor per
`GET /readings/current` request; WAL mode was implemented alongside the FK pragma fix since it
was a zero-risk one-liner directly addressing the SQLite-writer-contention concern the auto-capture
loop introduces; missing loading/error states on several list pages (`Alerts.tsx`, `Drying.tsx`,
`Printers.tsx`, `Materials.tsx`, `Sensors.tsx`, `Spools.tsx`); no ARIA label on the color-only
sensor-status dot in `DeviceModuleCard.tsx` (severity/status *badges* elsewhere already render
text, only this one dot is color-only); `StatusBadge` has no color mapping for sensor-type values
(`real`/`mock`/`manual`); two identically-named `sensor_type` fields with different value domains
(`SensorInfo.sensor_type` vs `Sensor.sensor_type`) — a naming landmine, not a bug today.

**Out of scope:** implementing the improvement opportunities above; any new feature work.

## Files & Modules Involved

Backend: `app/db/session.py`, `app/services/material_profile_service.py`,
`app/services/sensor_service.py`, `app/services/spool_assignment_service.py`,
`app/services/filament_spool_service.py`, `app/services/location_service.py`,
`app/services/reading_service.py`, `tests/api/test_materials.py`, `tests/api/test_assignments.py`,
`tests/api/test_sensors.py`, `tests/api/test_spools.py`, `tests/api/test_locations.py`, new
`tests/services/test_reading_service.py`.

Frontend: `hooks/resources/sensors.ts`, `hooks/resources/assignments.ts`, `pages/History.tsx`, new
`pages/History.test.tsx`.

## Implementation Steps

1. Three parallel subagent reviews (backend, frontend, security) + manual Playwright sweep of
   every page + direct `curl` reproduction of suspected FK/validation gaps.
2. Fix `MaterialProfile` threshold validation (create + update, merged-with-existing-row pattern).
3. Enable `PRAGMA foreign_keys=ON` + `PRAGMA journal_mode=WAL` for SQLite.
4. Add FK-existence checks across sensor/assignment/spool/location services.
5. Fix the hourly dew-point average denominator.
6. Fix frontend query invalidation gaps and the History page empty-state ambiguity.
7. Tests for every fix; full suite re-run; live re-verification in the browser (including
   restoring any demo data touched during verification).

## Validation Steps

1. `cd backend && pytest -q` — 170 passed.
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npx vitest run` — 160 passed,
   clean build/lint.
3. Playwright MCP: every page loaded with zero console errors; theme toggle (dark/light) checked
   visually; live reproduction of each bug pre-fix and re-verification post-fix (invalid material
   thresholds now 422, dangling FK creates now 404, delete-with-dependents now 400, sensor
   reassignment reflects on the Dashboard card immediately, History shows the correct
   before/after-search empty states).
4. No schema/column changes in this pass — restarting `uvicorn` (not deleting the dev DB) was
   sufficient; confirmed via `GET /health` and a handful of read/write smoke calls.

## Completion Criteria

- [x] All confirmed bugs fixed with a passing regression test each.
- [x] Backend tests green (`pytest -q` — 170 passed).
- [x] Frontend tests green (`tsc -b`, `build`, `lint`, `vitest run` — 160 passed).
- [x] Every page manually re-verified in the browser with zero console errors.
- [x] Demo data restored to its pre-verification state.
- [x] Improvement opportunities documented (this file + guide doc), explicitly not implemented.
- [x] Docs updated (`docs/Tasks.md`, this TASK.md, new guide doc).
- [x] Branch merged only after user validates in the browser.
