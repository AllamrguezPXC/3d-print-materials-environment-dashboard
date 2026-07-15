# User Acceptance Test — Bambu P1P + AMS (4 slots) + External Spool + Mock Sensor

## Objective

Final pre-delivery validation of the live application as a brand-new user would experience it —
not just re-running automated tests. Build a realistic scenario end-to-end through the UI (one
Bambu Lab P1P printer, a 4-slot AMS, an external spool, an explicitly-configured mock sensor,
specific filaments per slot, simulated high humidity for ASA/TPU, visible drying recommendations),
deliberately trigger 7 configuration-error scenarios to observe how the app responds, and document
everything — expected vs. actual behavior, bugs found, fixes applied, limitations.

## Context

The project has already passed automated tests (170 backend / 160 frontend) and a full compliance
audit against the assignment PDF. The user explicitly asked for one more practical validation pass,
acting as a new user clicking through the real UI, to catch anything automated tests and prior
Playwright spot-checks might have missed — especially around input validation, error messaging, and
whether intentional user mistakes (typos, duplicate serials, invalid state combinations) are
handled gracefully rather than crashing or silently corrupting data.

## Scope

- Create the printer, sensor, AMS slots, and spools scenario through the UI wherever the UI
  supports it. Fall back to the API only where the UI genuinely has no path (e.g., forcing an
  extreme humidity reading that mock sensors don't naturally drift to), documenting why.
- Deliberately trigger and observe: real-serial mock sensor rejection, duplicate serial rejection,
  double sensor assignment, a material-name typo, an empty spool selector, an incomplete AMS
  config, and an out-of-service printer state.
- Validate Dashboard, Printers, Sensors, Spools, and Drying Recommendations reflect the scenario
  correctly, including dashboard filters.
- Run pytest / tsc / build / lint / vitest. Fix any real bugs found (not test expectations).
- Do not use a global mock fallback, do not hardcode this scenario into permanent components, do
  not touch the real Dracal serial `E25877`, do not silently omit any bug found.

## Files & Modules Involved

- Frontend: `Dashboard`, `Printers`, `Sensors`, `Spools`, `Materials`, `Drying` pages and their
  forms/modals (via Playwright MCP interaction, not direct file edits, unless a bug fix is needed).
- Backend: whatever service/route turns out to contain a real bug, if any is found.
- New: `docs/User_Acceptance_Test_P1P_AMS_Mock_Sensor.md` (the deliverable QA report).
- `EVIDENCE.md`: new short section pointing to the report.

## Implementation Steps

See the numbered scenario/error list in the QA report itself — this TASK.md tracks completion,
the report captures the narrative.

## Validation Steps

1. `cd backend && pytest -q`
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npx vitest run`
3. Live Playwright MCP walkthrough per the scope above.

## Completion Criteria

- [x] Printer, AMS (4 slots), external spool, mock sensor created via UI and visible on Dashboard/
      Printers/Sensors/Spools.
- [x] All 7 intentional error scenarios triggered and their actual behavior documented.
- [x] High humidity simulated for ASA + TPU; Drying Recommendations shows both with all required
      fields, or the gap is documented as a bug.
- [x] Dashboard filters validated against the scenario.
- [x] Any real bug found is fixed and regression-tested (backend pytest and/or frontend vitest) —
      `create_printer` didn't sync implied Locations; fixed + 3 new tests.
- [x] `pytest -q` and `npx tsc -b && npm run build && npm run lint && npx vitest run` all green
      (173 backend, 160 frontend).
- [x] `docs/User_Acceptance_Test_P1P_AMS_Mock_Sensor.md` written with all 14 required sections.
- [x] `EVIDENCE.md` updated with a pointer to the report.
- [x] This session's own Playwright evidence stands in per established convention for QA/test
      tasks (live browser walkthrough, screenshots in `evidence/frontend-verification/`).
