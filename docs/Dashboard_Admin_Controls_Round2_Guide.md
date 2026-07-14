# Dashboard Admin Controls Round 2 Guide

Follow-up pass on `docs/Dashboard_Admin_Controls_Guide.md`, addressing five issues found during
browser validation of that task. See `docs/Tareas/dashboard-admin-controls-round-2/TASK.md` for the
task record.

## Notification bell now shows the alert's location

**Bug:** the bell listed each active alert's severity and message, but not *where* the affected
filament was — which printer, AMS slot, external spool, or storage location.

**Fix:** `AlertsBell.tsx` already had access to this (each `SensorReadingEntry` carries `location`),
it just discarded it when flattening to a plain alert list. Now each popover row is built from an
`{ alert, entry }` pair, and renders `describeSensorLocation(entry.location, printers)` — the same
helper `DeviceModuleCard`/`Sensors.tsx` already use to turn an AMS slot into `"{printer} — AMS"`
rather than a raw slot name. An orphan sensor with no location falls back to its serial number.

## `/alerts` history now populates automatically

**Bug:** `/alerts` (the persisted alert history/resolve page) stayed empty indefinitely, even with
clearly active alerts visible on the Dashboard.

**Root cause:** `Reading`/`Alert` rows are *only* ever written by `POST /readings` — either a manual
payload, or `capture_and_persist_all_active_sensors` (triggered by the "Capture reading now" button
on `/history`). Nothing called this automatically; `app/main.py`'s lifespan had no background task at
all. The Dashboard's live polling (`GET /readings/current`) computes everything in memory and never
persists.

**Fix:** new `backend/app/services/auto_capture.py`'s `run_auto_capture_loop(interval_seconds)` —
an asyncio task started from `app/main.py`'s lifespan alongside the existing seed step, calling the
already-existing `capture_and_persist_all_active_sensors` on a timer
(`Settings.auto_capture_interval_seconds`, default 30 seconds). A single failed tick (e.g. a
physical sensor briefly disconnected) is logged and skipped, not fatal to the loop. Disabled
deterministically in tests via `AUTO_CAPTURE_INTERVAL_SECONDS=0` (set in `conftest.py`, following the
same env-override pattern already used for `DATABASE_URL`) — otherwise the background task would
race against each test's own Reading/Alert assertions.

## Printer operational status is now color-coded

**Bug:** the operational-status `Select` rendered with default (uncolored) styling on both the
Dashboard and `/printers`, despite `lib/printerStatus.ts` already defining (and testing!)
`printerStatusBadgeClassName()` for exactly this purpose — it was simply never applied anywhere.
Also, `inactivo` mapped to a neutral grey tone, not the requested red.

**Fix:** `inactivo` now maps to `bg-destructive/15 text-destructive` (red); `activo` stays green
(`bg-ok/...`); `mantenimiento` stays yellow (`bg-warning/...`). `printerStatusBadgeClassName()` is
now applied to the operational-status `SelectTrigger` in both `DeviceModuleCard.tsx` (Dashboard) and
`Printers.tsx` — one function, two call sites, no duplicated color logic.

## AMS↔external-spool no longer ghosts an existing spool assignment; new hybrid type

**Bug:** switching a printer from `external_spool` to `ams` (or vice versa) made its previously
assigned spool disappear from its slot and from available-spool pickers, but it still counted as
"occupied" under the "occupied slots" filter and still appeared in "Affected Spools & Materials".

**Root cause:** `lib/deviceModules.ts` already computes `amsLocations`/`externalSpoolLocations`
independently, straight from actual `Location` rows (not from `filament_system_type` — a deliberate
prior design decision). The backend's `_sync_locations_for_filament_system_type` is deliberately
non-destructive: switching types never deletes the old type's `Location` row or its
`SpoolAssignment`. So after a switch, a printer can legitimately have *both* kinds of Locations (and
an active assignment on the no-longer-"current" one) — but `DeviceModuleCard.tsx`'s slot section was
`if (amsLocations.length > 0) {...} else if (externalSpoolLocations.length > 0) {...} else {...}`, a
mutually-exclusive chain that only ever rendered one branch. `deviceFilters.ts`'s
`matchesSlotOccupancy` (correctly) looks at both arrays together, and `alert_service.get_affected_spools`
(correctly) computes independently of what's rendered — so both of those already "saw" the spool
fine; the bug was purely that the card hid its slot.

**Fix:** changed the `if/else if/else` to two independent conditionals — the AMS grid renders
whenever `amsLocations` is non-empty, the external-spool row renders whenever
`externalSpoolLocations` is non-empty, and "No filament slots configured" only shows when *both* are
empty. No backend change needed; the "ghost" spool becomes visible (and manageable) again in its own
slot immediately.

This fix also directly enables the user's separate request for a **third `filament_system_type`
value**, `ams_external_spool`, for printers that genuinely use an AMS and an external spool at the
same time:

- Backend: added to `VALID_FILAMENT_SYSTEM_TYPES`; `_sync_locations_for_filament_system_type` (now
  factored into `_ensure_ams_slots`/`_ensure_external_spool_location` helpers) ensures both a full
  AMS slot set *and* an external-spool Location exist when switched to this value — same
  non-destructive, idempotent guarantee as the other two.
- Frontend: `PrinterForm.FILAMENT_SYSTEM_TYPES` (feeds both the printer-creation form and
  `Printers.tsx`'s row select) and `DeviceModuleCard`'s Dashboard-embedded toggle both gained the
  third option ("AMS + External Spool"); `lib/deviceType.ts` got a matching icon (`Layers`) and
  label. No new rendering logic was needed — the card already renders whatever Location rows exist,
  which is exactly what "both at once" means.

## Sensor assignment modal supports creating a new sensor inline

**Request:** the slot-assignment modal already supports creating a brand-new spool inline
(`SlotAssignmentModal`'s embedded `SpoolForm`); the sensor-assignment modal should support the same
for sensors.

**Fix:** `SensorAssignmentModal.tsx` gained a "+ Create new sensor" control (name, model, serial
number, type, and a port field/`PortSelect` when the type requires one) — mirroring
`SlotAssignmentModal`'s pattern, but actually simpler: a `Sensor`'s `location_id` is a direct column
(no separate assignment/join row like a spool has), so creating the sensor with `location_id` already
set to the modal's `targetLocation.id` assigns it in one step, with no second "select + Assign" call
needed. The button is disabled (with an inline explanatory note) while a sensor is already assigned
to the target location, since creating a second one there would trip the existing
one-sensor-per-AMS-module 400 the backend already enforces — the user unassigns the current one
first (the modal's existing control), then creates the replacement.

## Files changed

Backend: `app/core/config.py`, new `app/services/auto_capture.py`, `app/main.py`,
`app/services/printer_service.py`, `tests/conftest.py`, `tests/api/test_printers.py`, new
`tests/services/test_auto_capture.py`.

Frontend: `components/AlertsBell.tsx` (+ test), `lib/printerStatus.ts` (+ test),
`components/DeviceModuleCard.tsx` (+ test), `components/PrinterForm.tsx`, `lib/deviceType.ts` (+
test), `components/SensorAssignmentModal.tsx` (+ test), `pages/Printers.tsx`.

## Deferred / limitations (unchanged from before, still out of scope)

- Auto-capture's interval is configured via `.env`/environment variable only (same level as
  `dracal_vcp_port`), not from a Settings UI control — a reasonable future addition, not requested
  here.
- No change to `/alerts`' own filtering/resolve UI — the fix is that it now has real data to show,
  not a redesign of the page.
- Spool-availability logic (`spoolAvailability.ts`) is unchanged — the "ghost" spool was always
  correctly excluded from other pickers (it genuinely is still assigned somewhere); the bug was
  visibility on its own card, not availability logic elsewhere.
