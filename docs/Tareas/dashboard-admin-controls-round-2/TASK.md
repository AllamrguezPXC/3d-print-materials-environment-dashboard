# Dashboard admin controls round 2: alert location context, auto-capture history, status colors, AMS/spool bug + hybrid type, sensor creation in modal

## Objective

Address user feedback from browser validation of the previous `dashboard-admin-controls` task:
1. The notification bell doesn't say *where* an alert's filament is (printer/AMS slot/external
   spool/storage location).
2. `/alerts` history still never populates, even though live alerts are clearly active.
3. Printer operational status has no color coding (green/red/yellow).
4. Switching a printer AMS↔external-spool orphans its currently-assigned spool: it disappears from
   available-spool pickers and from its rendered slot, but still counts as "occupied" in filters and
   still shows in "Affected Spools & Materials" — a ghost assignment. Also requested: a third
   filament-system-type option for printers that use AMS and an external spool at the same time.
5. Sensor assignment should support creating a brand-new sensor inline, the same way slot assignment
   already supports creating a brand-new spool inline.

## Context

Root-caused all five directly by reading the relevant source (no Explore agents needed, all files
were already known from the prior task):

- **Bell location**: `AlertsBell.tsx` flattens `SensorReadingEntry.alerts` and discards the entry
  (which carries `location`/`location_id`) — so per-alert location context is available but unused.
  `lib/sensorLocation.ts`'s `describeSensorLocation(location, printers)` already exists and is exactly
  what's needed (same helper the Dashboard cards use); this task threads it into the bell.
- **Empty `/alerts` history**: confirmed via `reading_service.py` — `Reading`/`Alert` rows are ONLY
  ever persisted by `POST /readings` (either a manual payload or
  `capture_and_persist_all_active_sensors`, called by the "Capture reading now" button on
  `/history`). `app/main.py`'s lifespan has no background task at all — nothing calls this
  automatically, ever. The Dashboard's live polling (`GET /readings/current`) computes everything in
  memory and never persists. This was previously documented as a known limitation and deferred, but
  the user is now explicitly asking for it to be fixed, so this task adds a lightweight automatic
  background capture loop (asyncio task in the FastAPI lifespan, no new dependency), so Reading/Alert
  rows accumulate over time without requiring a manual click.
- **No status colors**: `lib/printerStatus.ts` already defines `printerStatusBadgeClassName()` (and
  tests it!) but it is never actually applied anywhere — the operational-status `Select` in
  `DeviceModuleCard.tsx` and `Printers.tsx` renders with default (uncolored) trigger styling. Also,
  `inactivo`'s current mapping (`bg-muted text-muted-foreground`, i.e. grey) doesn't match the user's
  explicit ask for red.
- **AMS/external-spool ghost assignment**: root cause is `DeviceModuleCard.tsx`'s slot-rendering
  block, which is an `if (amsLocations.length > 0) {...} else if (externalSpoolLocations.length > 0)
  {...} else {...}` — mutually exclusive. But `lib/deviceModules.ts` already computes
  `amsLocations`/`externalSpoolLocations` independently from actual `Location` rows (a deliberate
  prior design decision, not tied to `filament_system_type`), and the backend's
  `_sync_locations_for_filament_system_type` is deliberately non-destructive (never deletes a
  Location or its assignment when switching types). So after switching external_spool→ams, the
  printer legitimately has Locations (and an active `SpoolAssignment`) of BOTH types, but the card
  only ever renders one branch — hiding the still-assigned external-spool slot. This exactly explains
  every symptom reported: invisible in the UI, but still "occupied" per
  `deviceFilters.ts`'s `matchesSlotOccupancy` (which already correctly looks at
  `[...amsLocations, ...externalSpoolLocations]`, both arrays) and still listed in "Affected Spools &
  Materials" (computed independently via `alert_service.get_affected_spools`, location-based, not
  render-based). Fix is entirely in the card's rendering (show both if both are non-empty), which
  also directly enables the requested third "AMS + External Spool" `filament_system_type` value with
  no extra rendering work — the card already renders whatever Location rows exist.
- **Sensor creation in modal**: `SlotAssignmentModal.tsx` already has this exact pattern for spools
  (`SpoolForm` embedded inline, `useCreateSpool()`, auto-select the new spool on success). Sensor
  creation is actually simpler: `Sensor.location_id` is a direct field (no separate assignment/join
  row like spools have), so creating a sensor with `location_id` already set to the modal's
  `targetLocation.id` assigns it in one step — no second "select + Assign" call needed.

## Scope

**In scope:**
- `AlertsBell.tsx`: each alert row shows its location (`describeSensorLocation`), falling back to the
  sensor's serial number for an orphan sensor with no location.
- Backend: `run_auto_capture_loop` (new `app/services/auto_capture.py`), started as an asyncio task
  from `app/main.py`'s lifespan, calling the existing `capture_and_persist_all_active_sensors` on an
  interval (`Settings.auto_capture_interval_seconds`, default 30s; disabled in tests via env var so
  pytest stays deterministic).
- `lib/printerStatus.ts`: `inactivo` → red/destructive; `printerStatusBadgeClassName()` actually
  applied to the operational-status `Select` trigger in both `DeviceModuleCard.tsx` and
  `Printers.tsx`.
- `DeviceModuleCard.tsx`: render AMS grid AND external-spool slot(s) independently (both if both
  exist), fixing the ghost-assignment visibility bug with no backend change.
- New `filament_system_type` value `ams_external_spool` ("AMS + External Spool"): backend validation
  set + `_sync_locations_for_filament_system_type` ensures both an AMS set and an external-spool
  Location exist when switched to; frontend `PrinterForm.FILAMENT_SYSTEM_TYPES` (feeds both the
  creation form and `Printers.tsx`'s row select) and `DeviceModuleCard`'s Dashboard-embedded 2→3-value
  toggle; `lib/deviceType.ts` visual mapping.
- `SensorAssignmentModal.tsx`: inline "+ Create new sensor" (name/model/serial/type/port), creating
  directly with `location_id: targetLocation.id` — no separate assign step. Disabled with a note when
  a sensor is already assigned (creating a second one for the same location would trip the existing
  AMS one-sensor-per-module 400).

**Out of scope (documented, not omissions):**
- No change to `/alerts`' own filtering/resolve UI — the fix is that it now has real data to show,
  not a redesign of the page itself.
- Auto-capture interval is not user-configurable from the UI in this pass (env var / `.env` only,
  same level as `dracal_vcp_port` etc.) — a Settings control is a reasonable future addition, not
  requested here.
- No change to spool-availability logic (`spoolAvailability.ts`) — the "ghost" spool was always
  correctly excluded from pickers (it genuinely is still assigned somewhere); the bug was visibility,
  not availability logic.

## Files & Modules Involved

Backend: `app/core/config.py`, new `app/services/auto_capture.py`, `app/main.py`,
`app/services/printer_service.py`, `tests/conftest.py`, `tests/api/test_printers.py`,
new `tests/services/test_auto_capture.py`.

Frontend: `components/AlertsBell.tsx` (+ test), `lib/printerStatus.ts` (+ test),
`components/DeviceModuleCard.tsx` (+ test), `components/PrinterForm.tsx`, `lib/deviceType.ts` (+
test), `components/SensorAssignmentModal.tsx` (+ test), `pages/Printers.tsx`.

## Implementation Steps

1. Backend: `auto_capture.py` + lifespan wiring + settings + conftest opt-out + tests.
2. Backend: `ams_external_spool` filament-system-type value + sync + tests.
3. Frontend: `AlertsBell` location context.
4. Frontend: printer status colors (fix `inactivo`, apply the classname).
5. Frontend: `DeviceModuleCard` dual slot rendering + hybrid type option end-to-end.
6. Frontend: `SensorAssignmentModal` inline sensor creation.
7. Tests, docs.

## Validation Steps

1. `cd backend && pytest -q`
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test`
3. Playwright MCP: bell shows location per alert; wait for/trigger auto-capture and confirm
   `/alerts` populates without manually clicking "Capture reading now"; operational status select is
   visibly colored per state; switch a printer external_spool→ams and confirm its previously-assigned
   spool becomes visible again in the (now dual) slot grid instead of ghosted; switch to the new
   "AMS + External Spool" value and confirm both slot types render; create a brand-new sensor from
   the Dashboard's assign-sensor modal and confirm it's immediately assigned.
4. Delete `backend/environment_monitor.db` and restart `uvicorn` only if a schema-affecting change is
   needed (none of these changes add columns, so this should NOT be required this time — confirm).

## Completion Criteria

- [x] AlertsBell shows per-alert location (printer/AMS/external-spool/storage).
- [x] Backend auto-capture loop persists Reading/Alert rows periodically; `/alerts` populates without
      manual action; disabled deterministically in tests.
- [x] Printer operational status visibly color-coded (green/red/yellow) on both Dashboard and
      `/printers`.
- [x] AMS↔external-spool switch no longer ghosts an existing spool assignment; both slot types render
      when both exist.
- [x] New `ams_external_spool` filament-system-type option works end-to-end (Dashboard + `/printers`).
- [x] Sensor assignment modal supports creating a new sensor inline, auto-assigned to the target
      location.
- [x] Backend tests green (`pytest -q` — 153 passed).
- [x] Frontend tests green (`tsc -b`, `build`, `lint`, `test` — 153 passed, 27 files).
- [x] Playwright browser verification completed.
- [x] Docs updated.
- [ ] Branch merged only after user validates in the browser.
