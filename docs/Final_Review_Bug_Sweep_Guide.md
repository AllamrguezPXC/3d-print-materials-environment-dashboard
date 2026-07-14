# Final Review: Bug Sweep + Improvement Opportunities

Last full-stack review pass before marking the project complete. See
`docs/Tareas/final-review-bug-sweep/TASK.md` for the task record. Method: three parallel subagent
reviews (backend, frontend, security), each read-only, plus manual Playwright browser testing of
every page and direct `curl` reproduction of every suspected bug before treating it as real.

## Bugs found and fixed

### 1. `MaterialProfile` accepted internally inconsistent thresholds

**Root cause:** `schemas/material_profile.py` had no bounds or ordering validation at all. A
`POST /materials` with `ideal_rh_max_percent=80, warning_rh_max_percent=20,
critical_rh_max_percent=10` (inverted) was accepted and persisted.

**Why it matters:** `alert_service.evaluate_humidity_severity` compares a reading against these
three thresholds *in order* — `rh > warning_rh_max_percent or rh >= critical_rh_max_percent` →
critical, `rh > ideal_rh_max_percent` → warning, else ok. Inverted thresholds silently invert this
logic (e.g. a reading of 15% would read "critical" while 5% reads "ok", backwards from any sane
interpretation of the configured values) with no error anywhere in the pipeline.

**Fix:** `material_profile_service.py` gained `_validate_thresholds()`, called from both
`create_material_profile` (validates the full payload) and `update_material_profile` (validates
the *merged* result of existing values + the partial update, so patching just one field that
breaks consistency with an unrelated existing field is still caught). Enforces
`0 <= ideal_rh_max_percent <= warning_rh_max_percent <= critical_rh_max_percent <= 100`, each
`{ideal,warning,critical}_temp_min_c <= {ideal,warning,critical}_temp_max_c`, and
`drying_time_hours_min <= drying_time_hours_max`. Returns 422, matching the project's existing
`_validate_filament_system_type`/`_validate_operational_status` convention.

### 2. SQLite foreign keys were never enforced

**Root cause:** `app/db/session.py` never issued `PRAGMA foreign_keys=ON`. SQLite ignores
schema-declared `ForeignKey(...)` constraints unless this pragma is set per-connection — every
model's FK column (`Sensor.location_id`, `SpoolAssignment.spool_id`/`location_id`,
`FilamentSpool.material_profile_id`, `Location.printer_id`, etc.) was decorative only.

**Reproduced concretely:** created a `Location` with an active `SpoolAssignment` pointing at it,
deleted the `Location` — the delete succeeded (204) instead of the advertised 400, leaving
`SpoolAssignment.location_id` pointing at a row that no longer existed. (`Location.sensors`, the
one relationship with an ORM-level `back_populates`, was silently nulled on delete since
`Sensor.location_id` is nullable — a different, accidental "protection" that only worked because of
how that one relationship happens to be declared, not because integrity was actually enforced.)

**Fix:** `app/db/session.py` now registers a `@event.listens_for(engine, "connect")` handler that
runs `PRAGMA foreign_keys=ON` (and `PRAGMA journal_mode=WAL`, see below) on every SQLite connection.
This makes every existing `except IntegrityError: raise HTTPException(400, "cannot be deleted...")`
block across the service layer actually fire as documented.

### 3. Several create/update endpoints never checked that a referenced row existed

**Reproduced concretely:** `POST /assignments {"spool_id": 999999, "location_id": 888888}`
returned 200 and created a permanently-dangling `SpoolAssignment`. Same gap existed for
`PATCH /sensors/{id} {"location_id": <nonexistent>}`, `POST /spools {"material_profile_id":
<nonexistent>}`, and `POST /locations {"printer_id": <nonexistent>}`.

**Fix:** added small `_check_*_exists()` helpers (mirroring the existing `get_*_or_404` /
`create_drying_session` pattern already used elsewhere in the codebase) to
`sensor_service.py`, `spool_assignment_service.py`, `filament_spool_service.py`, and
`location_service.py`, called from both the create and update path whenever the relevant FK field
is present in the payload. Returns a clean 404 instead of persisting a dangling reference — this
is a second, independent layer of protection alongside the FK pragma from fix #2 (the FK pragma
protects the database; these checks give a much friendlier error message at the API boundary
before the database is even touched).

### 4. Hourly dew-point average divided by the wrong denominator

**Root cause:** `reading_service.get_readings_history`'s hourly aggregation summed only the
non-null `dew_point_c` values in a bucket, but divided by `len(bucket)` (every reading in that
hour) instead of the count of readings that actually had a dew point — silently biasing the
average toward zero whenever a bucket had a mix of null/non-null values.

**Status:** currently latent — every live write path (`persist_manual_reading`,
`capture_and_persist_all_active_sensors`) always computes a real `dew_point_c` via
`compute_dew_point_c()`, which never returns `None`. Fixed anyway as a real correctness bug, with a
service-level test (`tests/services/test_reading_service.py`) that inserts a row directly via
`save_reading()` with `dew_point_c=None` to exercise the previously-unreachable path.

### 5. Sensor/assignment mutations didn't invalidate the Dashboard's live query

**Root cause:** `hooks/resources/sensors.ts` and `hooks/resources/assignments.ts` only invalidated
their own resource's query key (`"sensors"`, `"assignments"`/`"spools"`) — not `"current-reading"`,
the separate query key `DeviceModuleCard`'s actual displayed reading/alerts/affected-spools come
from. Assigning or reassigning a sensor (or a spool) updated the modal's own dropdown immediately
(since that's driven by the `"sensors"`/`"assignments"` list) but left the Dashboard card showing
stale data until the next poll tick — up to the user's configured refresh interval away.

**Fix:** both hooks now also invalidate `"current-reading"`. Verified live: reassigning a sensor's
module now updates the card the instant the mutation resolves, with no wait.

### 6. History page's empty state didn't distinguish "not yet searched" from "genuinely empty"

**Root cause:** the readings-history query in `History.tsx` is `enabled: false` (manual fetch via
"Load history"), so `hourly` is `[]` before the user has ever clicked anything — indistinguishable
from a real empty range, so the page showed "No readings in this range yet" on first load, before
any query had even run.

**Fix:** added `isFetched` to the destructured query result; the page now shows "Choose a range and
click 'Load history'" until the first fetch completes, and only shows the genuine empty-range
message once `isFetched` is true and `hourly` is still empty.

## Improvement opportunities (documented, not implemented — out of scope for this pass)

| Opportunity | Tool / approach |
|---|---|
| Main JS bundle is ~880kB (Vite's own build warning) | `React.lazy(() => import("./pages/X"))` per route + a `<Suspense>` boundary around `<Outlet/>` in `Layout.tsx` — Dashboard/History (Recharts) are the heaviest routes and the best split candidates |
| Missing indexes on hot-path filter columns | `mapped_column(index=True)` on `Sensor.is_active`, `SpoolAssignment.location_id`/`is_active`, `Alert.is_active`/`severity`; a composite `Index("ix_locations_printer_type", "printer_id", "location_type")` in `models/location.py` |
| `get_affected_spools` computed twice per sensor per `GET /readings/current` (once directly, once again inside `build_alert_drafts`) | Compute once in `_build_entry`, pass the result into `build_alert_drafts` instead of letting it re-query |
| No loading/error state on most list pages (`Alerts.tsx`, `Drying.tsx`, `Printers.tsx`, `Materials.tsx`, `Sensors.tsx`, `Spools.tsx`) — a slow/failed request renders the same empty-state copy as a genuinely empty list | A shared `isPending`/`isError` wrapper pattern, e.g. centralized in `useResource.ts`'s `useList` |
| Color-only sensor-status dot (`DeviceModuleCard.tsx`) has no text/ARIA equivalent (its `title` attribute alone isn't reliably exposed to screen readers) | `role="img" aria-label="Sensor online"` (etc.) alongside the dot |
| `StatusBadge` has no color mapping for sensor-type values (`real`/`mock`/`manual`) — every sensor-type badge falls through to a generic gray | Add explicit entries to `lib/status.ts`'s variant map |
| Two identically-named `sensor_type` fields with different value domains (`SensorInfo.sensor_type: "real"\|"mock"\|"manual"` vs. `Sensor.sensor_type: "mock"\|"dracal_vcp"\|"dracal_cli"`) — not a bug today, but a landmine for a future change that assumes they're the same | Rename `SensorInfo.sensor_type` to `source` (mirroring the backend's own `_map_source` naming) to make the two domains visually distinct |

## Improvement implemented alongside the bug fixes (zero-risk, directly related)

- **WAL journal mode** (`PRAGMA journal_mode=WAL`) was added in the same `db/session.py` change as
  the foreign-key pragma. It lets the `auto_capture` background loop (a writer, ticking every 30s)
  coexist with concurrent HTTP read/write requests without blocking — a standard fix for exactly
  this "background loop vs. request" contention pattern in a local-first SQLite app. It's a no-op
  for the in-memory database the test suite uses.

## Files changed

Backend: `app/db/session.py`, `app/services/material_profile_service.py`,
`app/services/sensor_service.py`, `app/services/spool_assignment_service.py`,
`app/services/filament_spool_service.py`, `app/services/location_service.py`,
`app/services/reading_service.py`, `tests/api/test_materials.py`, `tests/api/test_assignments.py`,
`tests/api/test_sensors.py`, `tests/api/test_spools.py`, `tests/api/test_locations.py`, new
`tests/services/test_reading_service.py`.

Frontend: `hooks/resources/sensors.ts`, `hooks/resources/assignments.ts`, `pages/History.tsx`, new
`pages/History.test.tsx`.

## Verification

- `pytest -q`: 170 passed (12 new tests across the five backend fixes).
- `npx vitest run`: 160 passed (4 new tests for the History empty-state fix).
- `npx tsc -b`, `npm run build`, `npm run lint`: all clean.
- Live Playwright verification: every page loaded with zero browser console errors/warnings; theme
  toggle (dark/light) checked visually on Dashboard and Settings; each bug reproduced live via
  `curl` before the fix and re-verified as fixed after; sensor reassignment confirmed to update the
  Dashboard card instantly; all demo data touched during verification (sensor assignments, test
  rows) was restored to its original state afterward.
