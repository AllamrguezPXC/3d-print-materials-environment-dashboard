# Dashboard admin controls: notification bell, printer status, sensor/filament-system assignment, filter persistence

## Objective

Fix the Alerts sidebar/Dashboard inconsistency by replacing the sidebar "Alerts" nav link with a
global notification-bell popover fed by the same live data the Dashboard's alert panels use. Build
the four features explicitly deferred from the previous task: printer operational status
(activo/inactivo/mantenimiento), embedded sensor assignment/reassignment, AMS↔external-spool
switching, and filter persistence across reloads — all configurable from the Dashboard and
reflected 1:1 in the corresponding admin page (`/printers`, `/sensors`).

## Context

Continues directly from `docs/Tareas/dashboard-filters-and-fixes/TASK.md` (same branch,
`main-feature/dashboard-filters-and-fixes`, not yet merged) — these are exactly the items that
task's guide documented as "Deferred to a future task." The user validated the previous work in the
browser, found and had fixed a real Drying Recommendations bug, then asked for these deferred items
plus a new bug report: the sidebar Alerts page doesn't reflect the Dashboard's live alerts.

Full root-cause analysis and design decisions live in the plan file used to scope this work (3
parallel Explore agents covering: alerts inconsistency + nav/UI primitives, printer status + AMS
switching, sensor assignment + filter persistence).

## Scope

**In scope:**
- `AlertsBell` component (new `ui/popover.tsx` + `AlertsBell.tsx`) fed by the same
  `["current-reading"]` query the Dashboard already uses; replaces the sidebar "Alerts" nav link;
  links to `/alerts` (unchanged) for history/resolution.
- `Printer.operational_status` (activo/inactivo/mantenimiento): new column + validation, editable
  from `DeviceModuleCard` (Dashboard) and inline in `Printers.tsx`; visual dimming when not
  "activo"; new dashboard filter criterion.
- `sync_locations_for_filament_system_type`: non-destructive Location-row sync when
  `filament_system_type` changes (only ever creates missing rows, never deletes); Dashboard control
  limited to ams/external_spool; `Printers.tsx` keeps all 4 values.
- Sensor assignment/reassignment from `DeviceModuleCard` via a new shared `SensorAssignmentModal`
  (mirrors `SlotAssignmentModal`'s architecture); `Sensors.tsx` gains its first inline
  location-reassignment control (previously only create/delete existed there).
- Filter persistence via a new `useDeviceFilters` hook (localStorage, versioned key, merge-over-
  defaults); "Reset filters" button in `Settings.tsx`.

**Out of scope (documented, not omissions):**
- No functional coupling between operational status and alert suppression.
- No AMS slot-count editing (always 4, matching existing seed convention).
- No changes to `/alerts`'s own behavior (stays the persisted history/resolve page).
- Dashboard's filament-system-type control never offers storage_only/manual.

## Files & Modules Involved

See the plan file's "Archivos afectados" section for the full list (backend: `printer.py`,
`schemas/printer.py`, `printer_service.py`, `seed.py`, `test_printers.py`; frontend: new
`ui/popover.tsx`, `AlertsBell.tsx`, `SensorAssignmentModal.tsx`, `lib/printerStatus.ts`,
`hooks/useDeviceFilters.ts`, plus modifications to `Layout.tsx`, `DeviceModuleCard.tsx`,
`DeviceModuleGrid.tsx`, `Dashboard.tsx`, `Printers.tsx`, `Sensors.tsx`, `Settings.tsx`,
`deviceFilters.ts`, `DashboardFilters.tsx`, `sensorLocation.ts`, `SensorForm.tsx`,
`hooks/resources/printers.ts`, `types/api.ts`).

## Implementation Steps

1. Backend: `operational_status` column/schema/validation + seed default.
2. Backend: `sync_locations_for_filament_system_type` wired into `update_printer`.
3. Backend tests for both.
4. Frontend: printer operational-status UI (Dashboard select + dimming + Printers.tsx inline edit +
   dashboard filter criterion).
5. Frontend: AMS↔external-spool toggle (Dashboard, limited to 2 values) + Printers.tsx inline edit
   (4 values) + `invalidates: ["locations"]` on the printers resource hook.
6. Frontend: hoist `buildLocationOptions`, build `SensorAssignmentModal`, thread `sensors`/
   `locations`/`printers` into `DeviceModuleCard`/`Grid`/`Dashboard`, add `Sensors.tsx` inline
   reassignment.
7. Frontend: `useDeviceFilters` persistence + `Settings.tsx` reset button.
8. Frontend: `ui/popover.tsx` + `AlertsBell` + `Layout.tsx` nav change.
9. Tests, docs, validations.

## Validation Steps

1. `cd backend && pytest -q`
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test`
3. Playwright MCP: operational status change + dimming + Printers.tsx sync; AMS↔external-spool
   toggle + Printers.tsx sync; sensor assign/reassign/unassign + Sensors.tsx sync; filters persist
   across reload + Reset filters button; notification bell on a non-Dashboard page shows the same
   alerts as the Dashboard, with a working link to `/alerts`.
4. Delete `backend/environment_monitor.db` and restart `uvicorn` for the new `operational_status`
   column (no migration tool in this project).

## Completion Criteria

- [x] `Printer.operational_status` field added, validated, seeded, editable from Dashboard +
      Printers.tsx, visually dims non-"activo" cards, filterable.
- [x] `sync_locations_for_filament_system_type` implemented, non-destructive, idempotent; Dashboard
      AMS↔external-spool toggle works and syncs to Printers.tsx.
- [x] Sensor assignment/reassignment works from the Dashboard and from Sensors.tsx, reusing the
      existing AMS-conflict validation; two-step reassign (unassign then assign) confirmed correct.
- [x] Filters persist across page reloads; "Reset filters" button works.
- [x] Notification bell replaces the sidebar Alerts link, appears on every page, shows the same live
      alerts as the Dashboard, links to `/alerts`.
- [x] Backend tests green (`pytest -q` — 149 passed).
- [x] Frontend tests green (`npx tsc -b`, `npm run build`, `npm run lint`, `npm run test` — 146
      passed across 27 files).
- [x] Playwright browser verification completed.
- [x] Docs updated (`docs/Dashboard_Admin_Controls_Guide.md` new, `docs/Tasks.md`,
      `docs/Frontend_Redesign_Guide.md`).
- [ ] Branch merged only after user validates in the browser.
