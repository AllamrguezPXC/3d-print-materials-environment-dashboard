# Dashboard Device-Module Redesign Guide

This document explains the visual/structural redesign of the main Dashboard page (`/`), which
replaced a flat vertical stack of full-width sensor cards with a grid of compact "device modules"
inspired by Bambu Studio's device/AMS panel. It complements `docs/Frontend_Redesign_Guide.md`
(the general frontend architecture doc) — this one is scoped specifically to the Dashboard.

## 1. What problem this corrected

The user reviewed an earlier Bambu-Studio-inspired redesign (Phase 1, see
`docs/Tareas/printer-ams-sensor-config/TASK.md`) and found the Dashboard itself still "too simple,
not representative, no strong visual identity" compared to the reference screenshots: Bambu
Studio's device list, its AMS panel with 4 filament slots + an external-spool slot, and its compact
grid of environmental/control tiles.

The irony: almost everything needed to build this already existed — an AMS slot grid, a
slot-assignment modal, a humidity A–E scale, color swatches, and status badges had already been
built for `/printers/:id` (`PrinterDetail.tsx`) in earlier sessions. The Dashboard never adopted
that pattern; it kept rendering one `SensorReadingSection` per active sensor as a flat list,
grouped by nothing in particular. This redesign brings the already-built device-panel language to
the landing page, restructured around printers/locations instead of raw sensors, and denser to fit
several devices on screen at once.

## 2. How the reference images were used

- **Bambu Studio's device/AMS panel** (primary reference): informed the grouping (one panel per
  printer, not per sensor), the AMS grid's `A1`–`A4` slot labeling (already used by the existing
  `AmsSlotGrid`/`AmsSlotButton`, unmodified), and the external-spool ("Ext") slot as a sibling
  concept to the AMS grid.
- **Compact environmental tile layout** (secondary reference): informed `EnvMetricTile` — a denser
  sibling of the existing `ReadingCard`, four tiles in one row per module instead of four full-width
  cards stacked vertically.
- No logos, icons, or literal Bambu Studio assets were copied — the icon set is `lucide-react`
  (already a dependency), and the "device panel" look (accent bar, status dot, `Separator`-divided
  sections) is built entirely from this project's own existing Tailwind design tokens.

## 3. New architecture

```
frontend/src/
  lib/
    deviceModules.ts     buildDeviceModules(printers, locations, sensorEntries) -> grouped
                         view-models; toneForMetric(alerts, metric) -> tile tone. Pure, no
                         React, no fetching -- unit tested directly.
    deviceType.ts        filamentSystemVisual()/locationTypeVisual() -> icon + label + class.
                         Sibling to lib/status.ts, not an extension of it (see section 6).
  components/
    DeviceTypeIcon.tsx        Small icon+label chip for a module's category.
    EnvMetricTile.tsx         Denser sibling of ReadingCard for the compact metric row.
    ExternalSpoolSlot.tsx     The single "Ext" slot, visually matching AmsSlotButton.
    DeviceModuleCard.tsx      One printer's device module (see section 4).
    StandaloneLocationCard.tsx One non-printer location's module (room/storage/dry box/dryer).
    DeviceModuleGrid.tsx      Stateful container: builds the modules, owns the one shared
                             SlotAssignmentModal, renders the responsive grids.
  pages/
    Dashboard.tsx         Thin again: fetches all resources, renders <DeviceModuleGrid />,
                         then the (unchanged) Drying Recommendations section.
```

Explicitly **unchanged**: `PrinterDetail.tsx`, `SensorReadingSection.tsx`, `AlertPanel.tsx`,
`AffectedSpoolsPanel.tsx`, `ReadingCard.tsx`, `AmsSlotGrid.tsx`, `AmsSlotButton.tsx`,
`SlotAssignmentModal.tsx`, `HumidityScale.tsx`, `ColorSwatch.tsx`, `StatusBadge.tsx` — all imported
and composed as-is, never modified, so `/printers/:id` carries zero regression risk from this task.

No new dependency was added — no gauge/dial library, no animation library, no state-management
library. `HumidityScale` (already built) is the "compact visual indicator" the reference images
called for; a new gauge component was considered and rejected as redundant.

## 4. How a printer's device module works

Each printer always renders a module (`DeviceModuleCard`), even with zero sensors or zero
locations configured — a real, unconfigured printer is meaningful information, not fabricated data.
The module shows, top to bottom:

1. **Header**: a `DeviceTypeIcon` for the printer's `filament_system_type` (AMS/External
   Spool/Storage Only/Manual), a small colored status dot, the printer's name, brand, and model.
2. **Live reading** (if a sensor is assigned to any of the printer's locations): sensor serial +
   type badge + timestamp, then a row of 4 `EnvMetricTile`s (temperature, humidity, pressure, dew
   point) and the `HumidityScale` A–E strip. If the sensor reports an error, the existing
   "Sensor unavailable: {error}" banner renders instead — and the filament-slot section below still
   renders and stays editable, since an offline sensor must never block reassigning filament.
3. **Filament slots**: `AmsSlotGrid` if the printer has any `printer_ams` locations; one
   `ExternalSpoolSlot` per `printer_external_spool` location if it has those instead; otherwise a
   plain "No filament slots configured for this printer." line. `AmsSlotGrid` is never called with
   an empty array for a printer that simply isn't AMS-equipped — its own built-in copy
   ("No AMS configured") would misleadingly imply a missing AMS the printer was never meant to have.
4. **Alerts** and **Affected Spools & Materials**: the existing `AlertPanel`/`AffectedSpoolsPanel`,
   fed the module's merged (deduplicated) alerts/affected-spools across its sensor entries — in
   practice one entry per printer, since one sensor already covers an entire AMS module's shared
   microclimate (see `docs/Tareas/sensor-per-ams-module/TASK.md`).

A non-printer, sensor-bearing location (room/storage box/dry box/dryer) gets the same shell minus
the filament-slot section (`StandaloneLocationCard`) — these locations aren't sliced into slots.

## 5. Editing filament slots from the Dashboard

Clicking any slot (AMS or external-spool) opens the existing `SlotAssignmentModal` — the exact same
component `/printers/:id` uses, imported unmodified. Its state (`selectedLocation`,
`selectedSpoolId`, and the `handleSelectSlot`/`handleAssign`/`handleClear` handlers) lives once in
`DeviceModuleGrid`, not duplicated per module — every module's slots share the one modal instance,
mirroring `PrinterDetail.tsx`'s own state shape exactly so both pages behave identically.

## 6. Environmental data presentation

`EnvMetricTile` is a denser sibling of `ReadingCard` (same `label`/`value`/`icon`/`tone` prop
shape), rendered without the `Card` wrapper's padding so 4 fit in one compact row per module.
`toneForMetric(alerts, metric)` colors a tile `warning`/`critical` only when an active alert
currently targets that exact metric — never a fabricated "ok" when no alert exists, and never
colored by a *different* metric's alert.

Device-type badges (`DeviceTypeIcon`, from `lib/deviceType.ts`) are deliberately **neutral-colored**
(never the `ok`/`warning`/`critical` palette `StatusBadge`/`lib/status.ts` uses) — a device's
*category* (AMS, room, dry box, ...) is a different semantic axis from its *health*, and mixing the
two palettes would make "this is an AMS" read as a status alert.

## 7. Empty and edge states

| Case | What renders |
|---|---|
| Printer, zero sensors assigned | "No sensor assigned to this printer's locations." — no metrics/humidity scale, neutral status dot |
| Printer, sensor reports an error | The existing offline banner; slots stay visible and editable |
| Printer, zero AMS and zero external-spool locations | "No filament slots configured for this printer." |
| Non-printer location or orphan sensor with no alerts/spools | `AlertPanel`/`AffectedSpoolsPanel`'s own built-in empty copy |

## 8. Seed data addition

No `printer_external_spool` `Location` was ever seeded before this task — every `external_spool`
printer had zero locations of its own, so the new external-spool slot visual had nothing real to
render. `backend/app/db/seed.py` now seeds one such location for A1 mini #2 (no sensor of its
own — a bare external-spool holder has no consolidated environmental reading) plus a demo spool
assigned there, so the new slot type is verifiable against real data, not just its empty state.

## 9. Limitations / deferred

- No device-selector/carousel (Bambu Studio's actual single-device-at-a-time interaction) —
  `docs/Requirements.md` §11.1 requires showing all current readings at once; the responsive grid
  delivers the density goal without hiding any module.
- No sparklines/trend charts inside a module — `recharts` stays reserved for `/history`; a
  per-session trend view already exists for drying sessions (`DryingSessionTrendDialog`).
- No drag-and-drop slot reassignment — not requested, would need a new dependency.
- No per-module expand/collapse — unnecessary complexity at this app's data scale.
