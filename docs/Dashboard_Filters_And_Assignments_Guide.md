# Dashboard Filters & Assignment Fixes

This document covers a follow-up pass on the Dashboard device-module redesign
(`docs/Dashboard_Device_Redesign_Guide.md`): three correctness bugs found from
screenshots of the running dashboard, and a first version of Dashboard
filters. See `docs/Tareas/dashboard-filters-and-fixes/TASK.md` for the task
record.

## Bugs fixed

### 1. Environmental values were cut off / shown with only 1 decimal

**Cause:** `EnvMetricTile.tsx`'s value text had Tailwind's `truncate` class
inside a `min-w-0` flex container, so any value wider than the tile's
available width was clipped with an ellipsis (`"31...`"). The tile also sat 4
columns wide, leaving little room for values like `"1013.27 kPa"`.

**Fix:**
- `EnvMetricTile.tsx` no longer truncates its value (`whitespace-nowrap`
  instead), and the metric-tile grid is a fixed `grid-cols-2` (was
  `grid-cols-2 sm:grid-cols-4`) in both `DeviceModuleCard.tsx` and
  `StandaloneLocationCard.tsx`, giving each tile roughly double the width.
- A new `frontend/src/lib/format.ts` centralizes all environmental-value
  formatting: `formatTemperature`, `formatHumidity`, `formatPressure`,
  `formatDewPoint` (all 2 decimals, e.g. `"31.24 °C"`). Every prior ad hoc
  `.toFixed(1)` call site (`DeviceModuleCard`, `DeviceModuleGrid`,
  `StandaloneLocationCard`, `SensorReadingSection`, `HumidityScale`,
  `Sensors.tsx`) now uses these helpers.
- Backend: `alert_service.py` and `drying_service.py` now round floats
  (`round(value, 2)`) before interpolating them into alert/recommendation
  message strings, so `AlertPanel`/`DryingRecommendationCard` never show a
  long unrounded float in prose text.

### 2. Spool-assignment selector showed too few or zero spools

**Cause:** the "available spools" filter (in `DeviceModuleGrid.tsx` and
`PrinterDetail.tsx`, previously duplicated in both) was correct in intent — a
spool with any active `SpoolAssignment` anywhere in the system is excluded,
because a physical spool can only be in one place — but it's a **system-wide**
exclusion, so once most spools are assigned somewhere, every slot's dropdown
shrinks quickly. There was also no way to create a new spool without leaving
the modal.

**Fix:**
- Extracted the (already-correct) filter into
  `frontend/src/lib/spoolAvailability.ts` (`getAvailableSpools`), used by both
  `DeviceModuleGrid.tsx` and `PrinterDetail.tsx` instead of duplicating it.
- `SlotAssignmentModal.tsx` now shows each available spool's status badge
  alongside material/brand/color, and has an always-visible **"+ Create new
  spool"** button that reveals the existing `SpoolForm` inline. Submitting it
  calls `useCreateSpool()`; on success the new spool is auto-selected
  (`onSelectedSpoolIdChange`), so the user only has to click Assign. Because
  it uses the same `["spools"]` query key as `Spools.tsx`, the new spool shows
  up there automatically — no extra sync code.

### 3. "Drying Recommendations" always showed "No spools currently need drying"

**Cause (first pass):** `GET /drying/recommendations` (`drying_service.py`)
looked up the latest **persisted** `Reading` row for the exact `location_id`
a spool was assigned to. But a physical AMS module shares one sensor across
all its slots (`sensor-per-ams-module` task), and readings are only
persisted at the slot the sensor is actually attached to — a spool in a
sibling slot had no `Reading` row of its own and was silently skipped, even
though the same module's `AlertPanel` correctly showed a warning/critical
alert for it (via `alert_service.get_affected_spools`'s sibling-location
expansion). An initial fix made the persisted-`Reading` lookup expand to
sibling locations too, but that only patched half the bug.

**Root cause found in validation:** `Reading` rows are only ever persisted
via `POST /readings` (the "Capture reading now" button on `/history`) — the
Dashboard's live polling (`GET /readings/current`) never persists anything.
So even with the sibling-location fix, Drying Recommendations was reading a
**stale snapshot** from whenever someone last clicked "Capture reading now"
(minutes or hours old), while the Dashboard's alert panels are computed
fresh on every poll. A spool could flip from critical to ok (or vice versa)
on the Dashboard several times before Drying Recommendations ever saw the
change — this is exactly why the user could see 3 criticals in the Drying
Recommendations list while only 1 printer/location currently showed an
active alert.

**Actual fix:** `get_drying_recommendations` no longer touches the `Reading`
table at all. It now iterates every active `Sensor`, takes a **live** read
via the same `get_sensor_reader_for_sensor(...).read_current()` call
`GET /readings/current` uses, expands to the sensor's covered locations
(`alert_service._resolve_covered_location_ids`, same sibling-AMS expansion),
and evaluates humidity severity from that live value — the identical
computation the Dashboard's `AlertPanel` performs. A sensor that fails to
read (offline/misconfigured) contributes nothing, same per-sensor error
isolation `GET /readings/current` already has.

**Live updates in sync with the alert panels:** `Dashboard.tsx` now passes
its own `refreshInterval` (the user-configurable interval from Settings,
`useRefreshInterval()`) into `useDryingRecommendations(refreshInterval)`
instead of a hardcoded 15s default, so the Drying Recommendations section
refetches on the same cadence as the printer/location cards. Because both
are now computed from live sensor reads (not a shared single request),
there is a small window (one poll tick) where the two could reflect
slightly different live values for a mock sensor's random-walk simulation —
this is a cosmetic, sub-second discrepancy, not the multi-minute staleness
bug that was actually reported, and is consistent with how "live" data
already works everywhere else in this app (computed fresh per request, not
synchronized across separate endpoints).

`/drying` (the dedicated Drying page) uses the same `useDryingRecommendations`
hook and backend endpoint, so this fix applies there too, not just on the
Dashboard.

## Dashboard filters (first version)

A new filter bar (`DashboardFilters.tsx`) sits above the device-module grids
on `/`, following the same controlled-component shape as the existing
`FilamentFilters.tsx` (used on `/spools`): a `DeviceFiltersValue` object +
`EMPTY_DEVICE_FILTERS` constant, filtering done entirely client-side over data
already fetched by React Query — no new backend endpoints.

**Filter criteria:**

| Criterion | Values | Derived from |
|---|---|---|
| Search | free text | printer name/brand/model, AMS/external-spool location names, sensor serials, assigned spool brand/color |
| Alert status | No alert / Warning / Critical / Sensor offline / No sensor assigned | The same accent-tier logic `DeviceModuleCard` already computes (a sensor read error or active critical alert wins over a mere warning) |
| Sensor status | Active sensor / No sensor assigned / Mock sensor / Physical sensor | `sensorEntries[0].sensor.sensor_type` / presence |
| Slot status | Slots configured / No slots configured / Has empty slots / Has occupied slots | `amsLocations`/`externalSpoolLocations` + active `SpoolAssignment`s |
| Printer brand | generated from `printers.map(p => p.brand)` | never hardcoded — a new printer brand appears automatically |
| Filament type | generated from `materials.map(m => m.family)` | resolved via the module's assigned spools' `material_profile_id` |
| Filament brand / color / status | generated from `spools` | same spool-in-module resolution |

Standalone locations (room/storage_box/dry_box/dryer) are never sliced into
filament slots, so a specific "slot status" or "printer brand" filter always
excludes them — that's correct behavior, not an omission.

The bar shows a live "Showing X of Y" counter, one removable chip per active
filter, and a "Clear filters" button once any filter is active. An explicit
"No devices match the current filters." message appears when filters hide
every real module (distinct from the pre-existing "no sensors configured at
all" empty state).

The "Other Sensors" fallback section (orphan sensor entries with no
`location`) is **not** filtered — it's a rare edge case (a sensor pointing at
no location at all) and was left out of scope for this pass.

## Deferred to a future task

Per the user's explicit scope choice for this pass ("Correctness fixes +
filters"), these remain **not built**, not accidentally omitted:

- **Printer operational status** (`operational`/`idle`/`printing`/
  `maintenance`/`out_of_service`/`offline`/`unknown`) — no field exists on
  `Printer` today; would need a new column + migration (delete/recreate the
  dev DB, since this project has no Alembic) + UI to change it from the
  Dashboard.
- **Sensor assignment/reassignment embedded in each Dashboard module** — today
  sensors are still only assigned/moved from `/sensors`; the Dashboard shows
  the assigned sensor but doesn't let you change it inline.
- **AMS ↔ external-spool system-type switching with slot-count editing from
  the Dashboard** — `Printer.filament_system_type` is still only editable
  from `/printers`.
- **Filter-state persistence** across page loads/navigation — filters reset
  to `EMPTY_DEVICE_FILTERS` on remount; no UI-state persistence pattern
  exists in this project yet.
- A dedicated "Ambiente ideal" / "Fuera de rango" filter category, separate
  from alert status — redundant with the alert-status filter already
  covering warning/critical/no-alert.

## Files changed

New: `frontend/src/lib/format.ts`, `format.test.ts`,
`frontend/src/lib/spoolAvailability.ts`, `.test.ts`,
`frontend/src/lib/deviceFilters.ts`, `.test.ts`,
`frontend/src/components/DashboardFilters.tsx`, `.test.tsx`,
`frontend/src/components/SlotAssignmentModal.test.tsx`.

Modified: `EnvMetricTile.tsx`, `DeviceModuleCard.tsx`,
`StandaloneLocationCard.tsx`, `DeviceModuleGrid.tsx`,
`SensorReadingSection.tsx`, `HumidityScale.tsx`, `pages/Sensors.tsx`,
`SlotAssignmentModal.tsx`, `pages/PrinterDetail.tsx`, `pages/Dashboard.tsx`,
`backend/app/services/drying_service.py`,
`backend/app/services/alert_service.py`,
`backend/tests/services/test_drying_service.py`,
`backend/tests/api/test_drying.py`.
