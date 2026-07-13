# Dashboard device-module visual redesign

## Objective

Redesign the main Dashboard (`/`) page visually so it presents each printer/location as a compact
"device module" (à la Bambu Studio's device/AMS panel) instead of a flat vertical stack of
full-width sensor cards. The user reviewed an earlier Bambu-Studio-inspired redesign and found the
result still "too simple, not representative, no strong visual identity" — this task focuses
specifically on bringing the device-panel visual language (already built for `/printers/:id`) to
the Dashboard landing page.

## Context

Full audit (3 parallel Explore agents + 1 Plan agent) confirmed almost everything needed already
exists — this project already built an AMS slot grid, a slot-assignment modal, a humidity A-E
scale, color swatches, and status badges for `/printers/:id` (`PrinterDetail.tsx`) in earlier
sessions. The Dashboard never adopted that pattern; it still renders one `SensorReadingSection` per
active sensor as a flat list. This task ports the device-module pattern to the Dashboard, grouped
by printer/location rather than by sensor, in a more compact form suited to a landing page showing
several devices at once.

Key facts from the audit (see `C:\Users\AllamRodriguez\.claude\plans\lee-docs-requirements-md-docs-tasks-md-d-adaptive-firefly.md`
for the full plan):
- One sensor already covers an entire AMS module (fixed in `sensor-per-ams-module`) — matches
  Bambu Studio's own model (one shared reading, per-slot filament only).
- `Location.location_type` includes `printer_external_spool` as a real, documented value, but no
  row of that type is seeded yet — added one demo row + spool so the new external-spool slot visual
  is verifiable with real data.
- No backend change needed beyond the seed addition — all data already reachable via existing
  hooks (`usePrinters`, `useLocations`, `useSpools`, `useMaterials`, `useAssignments`,
  `getCurrentReading`).
- No gauge/dial component exists or is needed — `HumidityScale` (already built) is the compact
  visual indicator.

## Scope

Dentro: `frontend/src/pages/Dashboard.tsx` (rewritten to compose new components), new
`lib/deviceModules.ts` (grouping logic), `lib/deviceType.ts` (icon/label mapping), new components
`DeviceTypeIcon`, `EnvMetricTile`, `ExternalSpoolSlot`, `DeviceModuleCard`, `StandaloneLocationCard`,
`DeviceModuleGrid`; a demo `printer_external_spool` Location + spool in `backend/app/db/seed.py`;
tests for all new logic/components; `Dashboard.test.tsx` updated to the new tree.

Fuera: any change to `PrinterDetail.tsx`, `SensorReadingSection.tsx`, `AlertPanel.tsx`,
`AffectedSpoolsPanel.tsx`, `ReadingCard.tsx` (imported/composed only, never modified); any backend
endpoint change; any new dependency (no gauge library, no Framer Motion/Zustand/react-hook-form —
all already rejected project-wide); device-selector/carousel UI (Requirements.md §11.1 requires
showing all current readings at once); sparklines/charts inside modules (`recharts` stays reserved
for `/history`).

## Files & Modules Involved

- `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Dashboard.test.tsx`
- `frontend/src/lib/deviceModules.ts` (+ test), `frontend/src/lib/deviceType.ts` (+ test)
- `frontend/src/components/DeviceTypeIcon.tsx`
- `frontend/src/components/EnvMetricTile.tsx` (+ test)
- `frontend/src/components/ExternalSpoolSlot.tsx`
- `frontend/src/components/DeviceModuleCard.tsx` (+ test)
- `frontend/src/components/StandaloneLocationCard.tsx` (+ test)
- `frontend/src/components/DeviceModuleGrid.tsx`
- `backend/app/db/seed.py`
- `docs/Dashboard_Device_Redesign_Guide.md` (new), `docs/Frontend_Redesign_Guide.md`, `docs/Tasks.md`, `EVIDENCE.md`

## Implementation Steps

1. Seed: add one `printer_external_spool` Location for an `external_spool` printer (A1 mini #2) +
   a demo spool assigned there, following the existing idempotent seed patterns.
2. `lib/deviceModules.ts`: `buildDeviceModules(printers, locations, sensorEntries)` grouping into
   printer/standalone/orphan buckets; `toneForMetric(alerts, metric)`.
3. `lib/deviceType.ts`: `filamentSystemVisual()`/`locationTypeVisual()` icon+label+class mapping.
4. `DeviceTypeIcon.tsx`, `EnvMetricTile.tsx`, `ExternalSpoolSlot.tsx` — small presentational pieces.
5. `DeviceModuleCard.tsx` — per-printer module composing the above + existing `AmsSlotGrid`/
   `HumidityScale`/`AlertPanel`/`AffectedSpoolsPanel`, with the documented empty/edge states.
6. `StandaloneLocationCard.tsx` — simpler module for non-printer sensor-bearing locations.
7. `DeviceModuleGrid.tsx` — owns the single `SlotAssignmentModal` + assign/clear handlers (same
   shape as `PrinterDetail.tsx`), renders the responsive grids.
8. Rewrite `Dashboard.tsx` to fetch the additional resources and delegate to `DeviceModuleGrid`.
9. Tests for every new file; update `Dashboard.test.tsx` to the new tree, same 4 state-coverage
   intent (loading/error/empty/populated).
10. Validate: `tsc -b`/`build`/`lint`/`vitest run`, `pytest` (seed-only backend change), Playwright
    manual verification.

## Validation Steps

1. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test` — all clean.
2. `cd backend && pytest -q` — confirm still green after the seed addition (watch
   `test_seed_idempotent.py`'s count assertions).
3. Playwright MCP on `/`: each printer renders as a device module; an AMS printer shows its real
   slot grid and is editable inline (open modal, assign/change spool); an `external_spool` printer
   shows the "Ext" slot with the demo spool; a printer with no sensor shows the correct empty
   state; a standalone location (room/storage/dry box) renders its own simpler module; alerts and
   drying recommendations remain present and correct.

## Validation Result

Live end-to-end check: navigated to `/` with 7 seeded printers + 3 standalone locations. AMS
printers (A1 mini #1, P1S #1) render real slot grids (A1 mini #1's A1 has PLA/Black; P1S #1's A3
has PLA/Silver — the demo spool from the `sensor-per-ams-module` task, correctly surfaced via the
shared-sensor expansion). The new `external_spool` demo location renders the "Ext" slot with the
seeded PETG/Blue spool. Printers with no locations/sensor show the correct empty states. Clicking
an empty AMS slot opens the existing `SlotAssignmentModal` ("Configure AMS Slot 1 - P1S #1"),
confirming inline editing works from the Dashboard. Standalone locations (Primary Filament Storage
Room — real Dracal sensor, currently showing its known "Malformed Dracal VCP line" error since no
hardware is connected; Storage Box A; Dry Box 1) render as their own simpler modules with correct
alerts/affected-spools. Light mode toggled and confirmed consistent. Screenshots:
`evidence/frontend-verification/dashboard-device-modules.png`,
`evidence/frontend-verification/dashboard-slot-modal.png`,
`evidence/frontend-verification/dashboard-light-mode.png`.

## Completion Criteria

- [x] Seed: demo `printer_external_spool` Location + spool
- [x] `lib/deviceModules.ts` + `lib/deviceType.ts` with tests
- [x] `DeviceTypeIcon`, `EnvMetricTile`, `ExternalSpoolSlot`, `DeviceModuleCard`,
      `StandaloneLocationCard`, `DeviceModuleGrid` built, composing existing components unmodified
- [x] `Dashboard.tsx` rewritten; `Dashboard.test.tsx` updated to the new tree
- [x] `tsc -b`/`build`/`lint`/`vitest run`/`pytest` all clean
- [x] Playwright verification complete
- [x] `docs/Dashboard_Device_Redesign_Guide.md` written; `Frontend_Redesign_Guide.md`/`Tasks.md`/`EVIDENCE.md` updated
