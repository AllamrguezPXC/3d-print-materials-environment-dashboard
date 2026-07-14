# Dashboard Admin Controls Guide

This document covers a follow-up pass on the Dashboard (`docs/Dashboard_Filters_And_Assignments_Guide.md`):
a bug fix for the Alerts sidebar/Dashboard inconsistency (transformed into a global notification
bell), and the four items that guide explicitly listed as "Deferred to a future task" — printer
operational status, embedded sensor assignment, AMS↔external-spool switching, and filter
persistence. See `docs/Tareas/dashboard-admin-controls/TASK.md` for the task record.

## Notification bell (replaces the sidebar "Alerts" link)

**Bug:** the sidebar's "Alerts" page (`/alerts`) only ever showed **persisted** `Alert` rows —
written exclusively when someone uses "Capture reading now" on `/history` (`POST /readings`). The
Dashboard's per-module `AlertPanel`, by contrast, shows **live** alerts computed fresh on every poll
via `GET /readings/current`. These are two genuinely different data sources, so `/alerts` could be
empty or stale while the Dashboard showed active critical alerts, or vice versa.

**Fix:** rather than making `/alerts` compute live (which would break its real resolve/audit
workflow — a transient live alert has no `id` to `PATCH /alerts/{id}/resolve`), a new
`AlertsBell.tsx` component sources the exact same `["current-reading"]` query the Dashboard's
`AlertPanel` already reads, so it can never disagree with what the Dashboard shows. It renders as a
bell icon with a severity-toned count badge in `Layout.tsx`'s persistent header — appearing on every
page, not just the Dashboard — with a popover listing each active alert and a "View alert history →"
link to the unchanged `/alerts` page. The sidebar's static "Alerts" nav link was removed since the
bell now serves as the entry point; `/alerts` itself, `alert_admin_service.py`, and the `Alert`
model are all unchanged.

New: `frontend/src/components/ui/popover.tsx` (Radix wrapper, same pattern as `ui/dialog.tsx`/
`ui/select.tsx` — no new dependency, `radix-ui` was already installed), `AlertsBell.tsx`.

## Printer operational status

New `Printer.operational_status` field: `"activo"` / `"inactivo"` / `"mantenimiento"`, default
`"activo"`. Follows the exact precedent of `filament_system_type`'s earlier addition: a plain string
column (no DB-level enum), validated in `printer_service.py` (`_validate_operational_status`, 422 on
an invalid value), called from both `create_printer` and `update_printer`.

- Editable from the Dashboard: a compact `Select` in each `DeviceModuleCard`'s header, calling
  `useUpdatePrinter()`.
- Editable from `/printers`: a matching inline `Select` in the printer table row. Both call the same
  `PATCH /printers/{id}` endpoint and the same `useUpdatePrinter()` hook, so the two surfaces are
  automatically in sync via the shared `"printers"` TanStack Query cache key — no extra plumbing.
- Visual effect: a printer whose status isn't `"activo"` is dimmed (`opacity-60`) on its Dashboard
  card. This is **purely visual/administrative** — it never suppresses, filters, or gates that
  printer's alerts, since operational status is orthogonal to real environmental risk (a printer
  "under maintenance" can still have filament at risk of moisture damage).
- Filterable: a new "Printer status" criterion in the Dashboard filter bar (`lib/deviceFilters.ts`'s
  `printerStatus` field), following the same "standalone locations never match a specific value"
  rule the existing `printerBrand` filter already uses.

New: `frontend/src/lib/printerStatus.ts` (labels, badge tones, `isPrinterDimmed`) — a sibling to
`lib/deviceType.ts`/`lib/status.ts`, not an extension of either: operational status is a third
semantic axis (administrative state), distinct from device-type category and from live alert
severity.

## AMS ↔ external-spool switching from the Dashboard

The Dashboard's AMS/external-spool grid was already driven by actual `Location` rows, not by
`filament_system_type` directly (a deliberate prior design decision — see
`docs/Tareas/printer-filament-system-type/TASK.md`). Changing `filament_system_type` from the
Dashboard therefore needed new logic to keep the two in sync.

**New backend logic**, `printer_service._sync_locations_for_filament_system_type`, runs whenever
`update_printer` changes `filament_system_type`, and is deliberately **non-destructive** — it only
ever creates `Location` rows that are missing for the new type, never deletes or modifies existing
ones:

- Switching to `"ams"` → ensures 4 `printer_ams` Locations exist (creates any missing slots,
  matching the real AMS slot count already used in seed data).
- Switching to `"external_spool"` → ensures exactly 1 `printer_external_spool` Location exists.
- Switching to `"storage_only"`/`"manual"` → no Location changes (these types never implied a
  specific slot shape).

Because nothing is ever deleted, toggling AMS↔external-spool back and forth repeatedly is
idempotent and never orphans an active `SpoolAssignment` or `Sensor` — a printer can end up with
Locations of both types after several switches, which is harmless (an unused, empty slot is not
fabricated data, same as any printer that has slots but nothing assigned yet).

- The Dashboard's own toggle (in `DeviceModuleCard`'s header) is deliberately limited to the two
  values the user asked for (`"ams"` / `"external_spool"`) — it only appears when the printer's
  current type is already one of those two, since a 2-value toggle can't represent
  `"storage_only"`/`"manual"`. Those two remain reachable only from `/printers`, unchanged.
- `hooks/resources/printers.ts` now also invalidates the `"locations"` query key on any printer
  update, so the Dashboard picks up newly-synced Location rows immediately, without a manual
  refetch.
- `/printers` gained a matching inline `Select` (all 4 values) in the printer table row, calling the
  same endpoint — 1:1 sync with the Dashboard's 2-value toggle.

## Sensor assignment/reassignment from the Dashboard

Reassigning a sensor already worked at the backend level with no changes needed —
`PATCH /sensors/{id}` with a new `location_id` was already validated by the existing
`_check_ams_sensor_conflict` (from the `sensor-per-ams-module` task). What was missing was UI.

- `buildLocationOptions` (the AMS-slot-collapsing logic that turns a printer's 4 AMS slots into one
  selectable option) was hoisted from `SensorForm.tsx` into `lib/sensorLocation.ts`, alongside two
  new pure helpers: `representativeLocationForPrinter` (which Location a Dashboard-embedded control
  should target for a given printer) and `currentSensorForPrinter` (which sensor, if any, currently
  covers a printer's own locations). Both `SensorForm.tsx` and the new Dashboard control share this
  logic — no duplication.
- New `SensorAssignmentModal.tsx`, architecturally identical to the existing `SlotAssignmentModal`
  (a single shared modal owned by `DeviceModuleGrid`, opened via a per-card callback): shows the
  currently-assigned sensor with an "Unassign" action, and a picker of candidate sensors to
  assign/reassign. **Reassigning to a different sensor is two sequential backend calls** — unassign
  the current one (`location_id: null`), then assign the new one — mirroring exactly how spool
  reassignment already clears-then-creates, so the backend's one-sensor-per-module conflict check
  never trips on the sensor's own outgoing slot.
- `DeviceModuleCard.tsx` shows a small "Change" link next to an already-assigned sensor's serial
  number, or a "+ Assign sensor" button when the printer's module has none.
- `/sensors` gained its **first-ever** inline editing control (previously it only supported
  create/delete): a `Select` per row (using the same collapsed `buildLocationOptions`) to reassign a
  sensor's location directly from the admin table — closing the 1:1 symmetry gap.

## Filter persistence

New `frontend/src/hooks/useDeviceFilters.ts`, following the same pattern as the existing
`useRefreshInterval.ts` (the only prior localStorage-persistence in the app) but adapted for an
object instead of a single number:

- Storage key is versioned (`"dashboard-device-filters-v1"`) so a future filter-shape change can
  just bump the suffix — an old, incompatible stored value is then simply absent (falls back to
  defaults) rather than partially, confusingly recovered.
- Reading merges over `EMPTY_DEVICE_FILTERS` (`{ ...EMPTY_DEVICE_FILTERS, ...parsed }`), so a
  missing key (or malformed JSON, caught in a `try/catch`) never leaves a field `undefined`.
- Unlike `useRefreshInterval` (read-only; `Settings.tsx` owns the one write site), this hook's
  setter persists on every change, since the user changes filters directly on the Dashboard, not via
  a Settings page.
- `DeviceModuleGrid.tsx`'s `useState<DeviceFiltersValue>(EMPTY_DEVICE_FILTERS)` was swapped for
  `useDeviceFilters()` — everything else about the filter bar is unchanged.
- A new "Dashboard filters" card in `Settings.tsx` adds a "Reset filters" button
  (`localStorage.removeItem(...)`), mitigating the real risk that a forgotten restrictive filter
  now silently persists across sessions and confuses the user about why the Dashboard looks empty.

## Files changed

New: `frontend/src/components/ui/popover.tsx`, `AlertsBell.tsx` (+ `.test.tsx`),
`SensorAssignmentModal.tsx` (+ `.test.tsx`), `Layout.test.tsx`, `Printers.test.tsx`,
`Sensors.test.tsx`, `Settings.test.tsx`, `frontend/src/lib/printerStatus.ts` (+ `.test.ts`),
`frontend/src/hooks/useDeviceFilters.ts` (+ `.test.ts`).

Modified: `backend/app/models/printer.py`, `backend/app/schemas/printer.py`,
`backend/app/services/printer_service.py`, `backend/app/db/seed.py`,
`backend/tests/api/test_printers.py`, `frontend/src/components/Layout.tsx`,
`frontend/src/components/DeviceModuleCard.tsx` (+ `.test.tsx`), `DeviceModuleGrid.tsx`,
`frontend/src/pages/Dashboard.tsx`, `Printers.tsx`, `Sensors.tsx`, `Settings.tsx`,
`frontend/src/components/PrinterForm.tsx`, `SensorForm.tsx`,
`frontend/src/lib/sensorLocation.ts` (+ `.test.ts`), `deviceFilters.ts` (+ `.test.ts`),
`frontend/src/components/DashboardFilters.tsx`, `frontend/src/hooks/resources/printers.ts`,
`frontend/src/types/api.ts`.

## Deferred / limitations (unchanged from before, still out of scope)

- No AMS slot-count editing (always 4) — not requested; would need its own UI for growing/shrinking
  a configured module.
- Operational status has no functional effect beyond visual dimming and filtering — intentionally
  never gates alerts, per the domain rule that administrative status must never mask real
  environmental risk.
- `/alerts`'s own behavior is unchanged — it remains the persisted history/resolve page; the bell is
  a live view layered on top, not a replacement.
