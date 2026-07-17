# Fix: "+ Create new sensor" stuck disabled + long select value overflowing the Dashboard sensor-assignment modal

## Objective

Two related rounds of fixes to the "Assign sensor — P1S #1" modal (opened from the Dashboard's
"Change" button on a device module), both reported by the user via screenshots:

1. The "+ Create new sensor" button appeared permanently grayed out whenever the module already
   had a sensor, with a message telling the user to manually unassign first — but doing so closes
   the whole dialog, so there was no way to create-and-assign a new sensor to an already-covered
   module without leaving and reopening the flow.
2. After fix 1 shipped, the user reported a second issue: when a long-labeled sensor (e.g.
   `E25877 (currently at Primary Filament Storage Room)`) is selected in the "Reassign to a
   different sensor" dropdown, the select box and the "Assign" button visibly spilled out past the
   modal's right edge.

## Context

The user attached a screenshot of `SensorAssignmentModal` (opened from `DeviceModuleCard`'s
"Change" button on the Dashboard) and asked what was causing "the box to look that way." A live
Playwright MCP reproduction against the running dev servers pixel-matched the screenshot exactly
(same disabled "+ Create new sensor" button, same guidance text, same footer layout) — confirming
this is not a rendering/CSS bug, but the component behaving exactly as coded. Before/after
screenshots: `evidence/frontend-verification/sensor-assignment-modal-before-fix.png` and
`sensor-assignment-modal-after-fix.png`.

Reading `frontend/src/components/SensorAssignmentModal.tsx` revealed the actual defect:
- Reassigning to an **existing** sensor (the dropdown + "Assign" button) already does a clean
  2-step swap: unassign the module's current sensor, then point the newly selected sensor at this
  module (`DeviceModuleGrid.tsx::handleAssignSensor`).
- Creating a **new** sensor for the module had no equivalent swap — `handleCreateSensor` just
  called `create_sensor` directly, and the button was `disabled={currentSensor !== null}` with a
  message asking the user to unassign first.
- But `onUnassign` (wired to `handleUnassignSensor` in `DeviceModuleGrid.tsx`) calls
  `setSensorAssignmentPrinter(null)` on success — it closes the entire dialog. So the suggested
  workaround ("unassign, then create") required leaving the flow, going back to the Dashboard,
  clicking "+ Assign sensor" again, and only then would the create button become enabled. A
  functional but confusing, disabled-looking dead end — exactly what read as "broken" in the
  screenshot.

## Root Cause

Inconsistent handling of the two "point this module at a sensor" paths: the existing-sensor path
supported the swap-in-place pattern; the new-sensor path did not, and was blocked with a UI dead
end instead.

## Fix

`frontend/src/components/SensorAssignmentModal.tsx`:
- `handleCreateSensor` now mirrors `handleAssignSensor`'s pattern: if a `currentSensor` exists, it
  is unassigned (`location_id: null`) via `useUpdateSensor` first, then the new sensor is created
  with `location_id` already pointed at the target location — both awaited in sequence so the
  backend's AMS-conflict check never trips.
- Removed `disabled={currentSensor !== null}` from the "+ Create new sensor" button — it's now
  always enabled whenever a `targetLocation` exists.
- Replaced the blocking "Unassign the current sensor before creating a new one for this module."
  message with a non-blocking heads-up: "Creating a new sensor here will unassign
  {currentSensor.serial_number} from this module." (only shown when not already in the create
  form, and named after the actual sensor being displaced for clarity).
- Errors from either the unassign or the create call now surface inline via a local `createError`
  state (previously only `createSensor.isError` was checked).

## Root Cause 2 — overflow when a long select value is chosen

A second live Playwright MCP reproduction (selecting `E25877 (currently at Primary Filament
Storage Room)` in the same modal) pixel-matched the user's second screenshot: the select trigger
and the "Assign" button both rendered past the dialog's right edge.

Direct DOM measurement (`getBoundingClientRect()` + `getComputedStyle()` on the actual elements
inside the dialog, not guessed from the JSX) showed the select trigger computed to 381px wide
inside a ~352px-wide dialog, even after adding `min-w-0 flex-1` to the `SelectTrigger` itself. The
trigger's own `min-width: 0` was correctly applied, but it wasn't the bottleneck — measuring the
DOM chain revealed the flex ROW containing the select+button (`flex items-center gap-2`) was
itself rendering at 451px, wider than the dialog. This is the classic flexbox/grid **"automatic
minimum size"** gotcha: every flex/grid item defaults to `min-width: auto`, meaning it refuses to
shrink below its content's intrinsic (`whitespace-nowrap`) minimum width *unless something in the
chain explicitly resets it to 0*. `SensorAssignmentModal.tsx` nests several nested
`flex flex-col`/`flex items-center` wrapper `div`s between the dialog's grid container and the
actual select — resetting `min-width` at only the deepest level (the trigger) doesn't help if any
ancestor in that chain still has the default `min-width: auto`, since the long unbreakable text's
intrinsic width still propagates upward through every un-reset flex/grid item.

**Fix:** added `min-w-0` to every nested flex container between `DialogContent` and the select row
in `SensorAssignmentModal.tsx` (the main body wrapper, the "Reassign..." section wrapper, and the
row itself), matching the trigger's own `min-w-0 flex-1`. Applied the identical `min-w-0` fix to
`SlotAssignmentModal.tsx`'s spool-select row, which has the exact same `SelectTrigger
className="flex-1"` pattern (latent, less visible there since spool option labels are usually
shorter). Also added `overflow-hidden` to the shared `DialogContent` primitive
(`ui/dialog.tsx`) as a defensive backstop so any future similar overflow is clipped at the dialog's
rounded corners rather than visually bleeding past them — verified this doesn't affect any other
dialog, since `SelectContent`'s dropdown list renders through a separate Radix portal (outside
`DialogContent` in the DOM) and is unaffected by its ancestor's `overflow-hidden`.

## Files Changed

- `frontend/src/components/SensorAssignmentModal.tsx`
- `frontend/src/components/SensorAssignmentModal.test.tsx` (updated the test that asserted the old
  disabled behavior; added a test confirming the unassign-then-create sequence)
- `frontend/src/components/SlotAssignmentModal.tsx` (same `min-w-0` overflow fix applied to its
  analogous spool-select row)
- `frontend/src/components/ui/dialog.tsx` (`overflow-hidden` added to `DialogContent` as a
  defensive backstop, app-wide)

## Validation Steps

1. `cd frontend && npx vitest run src/components/SensorAssignmentModal.test.tsx` — 9/9 passing.
2. `cd frontend && npx tsc -b && npm run lint && npx vitest run` — clean, 174/174 tests (32 files).
3. Live Playwright MCP verification against the running dev servers, for **both** fixes:
   - Fix 1: reproduced the exact reported screenshot state (P1S #1, MOCK-0004 assigned,
     "+ Create new sensor" disabled) before the fix; after the fix, the same button is enabled
     with the new message; clicked it, filled in a new mock sensor, submitted "Create & assign",
     and confirmed via `GET /sensors` that MOCK-0004 was unassigned (`location_id: null`) and the
     new sensor took its place at the same location — exactly the intended swap.
   - Fix 2: reproduced the exact reported overflow (selected `E25877 (currently at Primary
     Filament Storage Room)`) before the fix, confirming via direct DOM measurement that the
     trigger/button rendered past the dialog's right edge; after the fix, measured again and
     confirmed `triggerRect.right <= dialogRect.right` (contained), with a before/after screenshot
     comparison showing the select+button now fully inside the modal's border.
   - Restored the original demo state after each round (MOCK-0004 back on P1S #1; the throwaway
     test sensor from fix 1's verification is left archived in Trash since a live auto-capture
     Reading blocks its hard delete, same pre-existing guard behavior working as intended).

## Completion Criteria

- [x] Root cause 1 (disabled Create button) identified via live reproduction, not speculation.
- [x] Root cause 2 (layout overflow) identified via live reproduction + direct DOM measurement,
      not speculation.
- [x] Fix 1 implemented: creating a new sensor swaps in cleanly, no dead end.
- [x] Fix 2 implemented: long select values stay contained within the dialog in both affected
      modals (`SensorAssignmentModal`, `SlotAssignmentModal`), plus a defensive `overflow-hidden`
      on the shared `DialogContent` primitive.
- [x] Frontend tests updated and passing.
- [x] Full validation (`tsc`/`lint`/`vitest`) clean.
- [x] Live Playwright MCP verification of both fixed flows, with demo data restored afterward.
- [x] Findings documented here and in `EVIDENCE.md`.
