# Sensor per AMS module (data model correction)

## Objective

Correct a real data-model gap the user identified: a physical AMS module has exactly **one**
shared sensor covering the microclimate of all its slots (4 or more) — not one sensor per slot.
Same for a printer with external spool (one sensor per printer) and a dryer/oven (already correct
today, since a dry box/oven is one `Location`, not split into slots). Today `Sensor.location_id`
can point at a single AMS-slot `Location`, and the alert/affected-spools evaluation only looks at
that exact `location_id` — nothing expands to sibling slots of the same printer, and nothing
prevents assigning a second sensor to a different slot of the same AMS module.

## Context

Raised by the user directly (not from the Requirements.md audit) after being asked to explain what
"sensor-inheritance resolution UI" (a previously-deferred, judged-out-of-scope item) would consist
of. That explanation surfaced a distinct, real correction: not a UI question about resolving a
hierarchy, but a data-model fact the app currently violates by allowing per-slot sensor assignment.

Planned via Plan Mode with two parallel Explore agents (backend sensor/location coupling; frontend
AMS display components) before implementation — see the plan file for the full audit. Key findings:
- No pre-existing violation in seed data (A1 mini #1's AMS has only 1 slot seeded; P1S #1's AMS
  has 4 slots but zero sensors assigned to any of them) — clean slate, no data to reconcile.
- `PrinterDetail.tsx` already filters sensor entries by `printer_id` (not exact slot), so the
  Dashboard/PrinterDetail "Environment" section already displays correctly per printer without
  any change — the real gaps are: (1) backend alert/affected-spools evaluation only matches the
  sensor's exact `location_id`, never expanding to sibling AMS slots; (2) no validation prevents
  assigning a second sensor to another slot of the same AMS; (3) the frontend shows the literal
  slot name ("AMS Slot 1 - A1 mini #1") as if the sensor only covered that slot, and the sensor
  assignment dropdown lists all 4 slots as if they were independent, equivalent choices.

**Design decisions** (see the plan file for full reasoning):
- Backend fix centralized in `alert_service.get_affected_spools` (the single function all 3
  alert/reading flows depend on) — generalized to expand to any Location sharing
  `(printer_id, location_type)`, not hardcoded to the string `"printer_ams"`, so any future
  per-printer multi-row location type is covered for free.
- New validation `_check_ams_sensor_conflict` in `sensor_service.py`, following the exact existing
  `_check_duplicate_serial` pattern (HTTPException 400 — "conflicts with existing data", this
  project's established convention vs. 422 for "invalid config").
- Frontend: a new pure helper `describeSensorLocation()` relabels AMS-slot locations as
  "{printer name} — AMS"; `SensorForm`'s location dropdown collapses AMS slots to one option per
  printer. `AmsSlotGrid`/`ReadFromAmsPanel` (per-slot filament assignment) are untouched — that's a
  genuinely different, still-correct per-slot concept.
- Seed: added a demo sensor + spool to P1S #1's AMS (previously completely unmonitored) so the
  shared-sensor/cross-slot-alert behavior is demonstrable live, not just via manual `curl` setup.

## Scope

Dentro: `alert_service.py` (sibling expansion), `sensor_service.py` (new validation),
`seed.py` (demo sensor + spool for P1S #1's AMS), `lib/sensorLocation.ts` (new helper),
`SensorReadingSection.tsx`, `Dashboard.tsx`, `PrinterDetail.tsx`, `Sensors.tsx`, `SensorForm.tsx`,
tests for all of the above.

Fuera: `AmsSlotGrid.tsx`/`AmsSlotButton.tsx`/`ReadFromAmsPanel.tsx`/`SlotAssignmentModal.tsx` (per-slot
filament assignment, unaffected); any schema change (`LocationInfo` already exposes `printer_id`,
no new column needed); the two previously-deferred items (sensor-inheritance UI without a real
hierarchy, `MaterialProfile` nozzle/bed-temp fields) remain out of scope, unrelated to this fix.

## Files & Modules Involved

- `backend/app/services/alert_service.py`
- `backend/app/services/sensor_service.py`
- `backend/app/db/seed.py`
- `backend/tests/services/test_alert_service.py`, `backend/tests/api/test_sensors.py`
- `frontend/src/lib/sensorLocation.ts` (new), `frontend/src/lib/sensorLocation.test.ts` (new)
- `frontend/src/components/SensorReadingSection.tsx` (+ new test)
- `frontend/src/components/SensorForm.tsx` (+ new test)
- `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/PrinterDetail.tsx`, `frontend/src/pages/Sensors.tsx`
- `docs/Frontend_Redesign_Guide.md`, `docs/Tasks.md`, `EVIDENCE.md`

## Implementation Steps

1. `alert_service.py`: `get_affected_spools(session, location_id)` resolves the `Location`; if
   `printer_id is not None`, expand to sibling location ids sharing `(printer_id, location_type)`
   before filtering `SpoolAssignment`. Locations without a `printer_id` behave unchanged.
2. `sensor_service.py`: `_check_ams_sensor_conflict(session, location_id, exclude_id=None)` —
   reject (400) assigning a sensor to a `Location` with `printer_id` set when another active sensor
   already targets a sibling location. Called from `create_sensor` always, `update_sensor` only
   when `"location_id"` is in the update payload.
3. `seed.py`: add `Mock Sensor 4` (`MOCK-0004`) to P1S #1's AMS slot 0, plus a demo spool assigned
   to a different slot of the same AMS (e.g. slot 2) to demonstrate cross-slot alert coverage.
4. Backend tests: sibling expansion (2 spools in 2 different slots of one printer, both appear for
   one sensor's reading), non-AMS locations unaffected, sensor-conflict validation (create/update
   reject, same-AMS reassignment via `exclude_id` allowed, non-AMS locations unrestricted).
5. `frontend/src/lib/sensorLocation.ts`: `describeSensorLocation(location, printers)`.
6. `SensorReadingSection.tsx`: optional `printers?: Printer[]` prop, uses the helper for the label.
7. `Dashboard.tsx`: add `usePrinters()`, pass down. `PrinterDetail.tsx`: pass its already-fetched
   `printers` down.
8. `Sensors.tsx`: add `usePrinters()`, use the helper in the table, pass `printers` to `SensorForm`.
9. `SensorForm.tsx`: new `printers: Printer[]` prop; collapse AMS-slot location options to one per
   printer (lowest `slot_index` as the representative `location_id`).
10. Frontend tests for the new helper, `SensorReadingSection`, and `SensorForm`.
11. Validate: `pytest`, `tsc -b`/`build`/`lint`/`vitest run`, Playwright manual verification.

## Validation Steps

1. `cd backend && pytest -q` — 132 existing + new tests, all green. No schema change, so the dev DB
   doesn't need deleting — just restart `uvicorn` so the idempotent seed adds the demo sensor/spool.
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test` — all clean.
3. Playwright MCP: `/printers/5` (P1S #1) shows the shared sensor's reading; a spool in a different
   slot of the same AMS still shows up as affected/alerted; on `/sensors`, creating a sensor on a
   slot of an already-occupied AMS shows the 400 error; `SensorForm`'s location dropdown shows one
   "P1S #1 — AMS" option instead of 4 separate slots.

## Validation Result

Live end-to-end check (after deleting the dev DB so the new seed data — spool count was already
non-zero from prior sessions — actually got created): `/printers/5` (P1S #1) shows "MOCK-0004"
labeled "P1S #1 — AMS" instead of the misleading exact slot name, and "Affected Spools & Materials"
correctly lists the PLA/Silver spool seeded in a *different* slot (A3) of the same AMS — proving
the sibling-expansion fix works (screenshot:
`evidence/frontend-verification/printer-detail-shared-ams-sensor.png`). On `/sensors`, the admin
table shows "A1 mini #1 — AMS"/"P1S #1 — AMS" for the AMS-tied sensors; the location dropdown in
the add-sensor form collapsed P1S #1's 4 slots to one "P1S #1 — AMS" option; attempting to create a
second sensor on that same AMS module correctly failed with a 400 (confirmed via the browser's
network console log; the row was never added — screenshot:
`evidence/frontend-verification/sensors-ams-conflict-error.png`).

One jsdom gap surfaced during frontend testing: Radix `<Select>` needs `hasPointerCapture`/
`scrollIntoView`, which jsdom doesn't implement — added the standard polyfill to
`src/test/setup.ts` (benefits any future test that opens a Select's dropdown, not just this task's).

## Completion Criteria

- [x] `get_affected_spools` expands to sibling AMS-slot locations
- [x] `_check_ams_sensor_conflict` validation (create + update paths)
- [x] Seed demo sensor + spool for P1S #1's AMS
- [x] Backend tests for sibling expansion + conflict validation
- [x] `describeSensorLocation` helper + `SensorReadingSection`/`Sensors.tsx` relabeling
- [x] `SensorForm`'s AMS dropdown collapsed to one option per printer
- [x] Frontend tests for the helper, `SensorReadingSection`, `SensorForm`
- [x] `pytest`/`tsc -b`/`build`/`lint`/`vitest run` all clean
- [x] Playwright verification complete
- [x] Docs updated (`Frontend_Redesign_Guide.md`, `Tasks.md`, `EVIDENCE.md`)
