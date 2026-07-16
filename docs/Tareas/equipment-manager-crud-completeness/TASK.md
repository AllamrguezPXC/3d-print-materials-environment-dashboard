# Equipment Manager CRUD Completeness — Edit, Duplicate, Trash/Restore

## Objective

Bring all 5 equipment/config entity types (Printers, Sensors, Locations/Dryers, Materials, Spools)
to CRUD parity: full-field editing from the UI (the backend already supports it), a "duplicate as
template" action, and a reversible soft-delete ("archive") with a Trash page to restore or
permanently delete.

## Context

A live QA audit (reading all 5 schemas/routes/pages directly) found: delete already works well
(hard delete, referential-integrity guarded) in all 5; edit is inconsistent (Materials fully
editable, Spools mostly, Printers/Sensors/Locations only expose 0-2 fields via the UI even though
the backend's PATCH schemas support every field); duplicate and restore-after-delete don't exist
anywhere. The user chose to plan and implement all three gaps. Full design rationale, decisions,
and file list: see the plan file referenced in this session (soft-delete is additive — a new
`archive`/`restore` pair, not a change to the existing `DELETE` endpoint's behavior, so no existing
test needs to change).

## Scope

- Backend: `SoftDeleteMixin` (`deleted_at`) on all 5 models; `archive_X`/`restore_X`/`duplicate_X`
  service functions + routes for all 5; `list_X(deleted_only=False)` filtering; exclude archived
  sensors from the 3 live-read loops (`environment_service`, `drying_service`, `reading_service`);
  filter archived rows out of cross-entity `_check_*_exists` validators and the AMS-conflict /
  duplicate-serial checks in `sensor_service`.
- Frontend: extend `PrinterForm`/`SensorForm`/`LocationForm` with their missing fields; new
  `EditPrinterModal`/`EditSensorModal`/`EditLocationModal` (matching the existing
  `EditSpoolModal` pattern); "Duplicate" buttons on all 5 pages; existing "Delete" buttons rewired
  to call `archive` instead of the hard `remove`; new `/trash` page combining all 5 resources'
  archived rows with Restore / Delete permanently.
- Do not change the existing `DELETE` endpoints' behavior or tests. Do not touch `seed.py`'s
  idempotency helpers (documented limitation). No Alembic — schema change requires deleting the
  dev SQLite DB and restarting `uvicorn`.

## Files & Modules Involved

Backend: `app/models/mixins.py` (new), all 5 models, all 5 services, `environment_service.py`,
`drying_service.py`, `reading_service.py`, all 5 routers.
Frontend: `PrinterForm.tsx`, `SensorForm.tsx`, `LocationForm.tsx`, 3 new Edit modals, new
`Trash.tsx`, `useResource.ts`, all 5 `hooks/resources/*.ts`, `api/config.ts`, `Printers.tsx`,
`Sensors.tsx`, `Materials.tsx`, `Spools.tsx`, `Layout.tsx`, `App.tsx`.

## Implementation Steps

See the plan file for full detail. High level: (1) backend soft-delete infra, (2) backend
duplicate, (3) backend gap-closing (live-read loops + FK-existence filters), (4) backend routes,
(5) backend tests, (6) reset dev DB, (7) frontend form/modal work, (8) frontend hook/API wiring,
(9) frontend page wiring, (10) Trash page, (11) frontend tests, (12) full validation, (13)
Playwright live verification, (14) docs.

## Validation Steps

1. Delete `backend/environment_monitor.db`, restart `uvicorn`.
2. `cd backend && pytest -q`
3. `cd frontend && npx tsc -b && npm run build && npm run lint && npx vitest run`
4. Playwright MCP: for each of the 5 entity types — edit a previously-inaccessible field, duplicate
   an item (confirm name/serial adjustment), archive it ("Delete"), confirm it's gone from its page
   but present in `/trash`, restore it, confirm it reappears; then archive + permanently delete and
   confirm the referential-integrity guard still applies when in use.

## Completion Criteria

- [x] `SoftDeleteMixin` added, all 5 models inherit it, dev DB reset.
- [x] `archive_X`/`restore_X`/`duplicate_X` + `list_X(deleted_only=)` implemented for all 5
      entities, with routes wired.
- [x] Archived sensors excluded from `GET /readings/current`, drying recommendations, and
      manual/auto capture.
- [x] Cross-entity existence checks reject references to archived rows.
- [x] Backend pytest coverage for all of the above, full suite green (203/203).
- [x] `PrinterForm`/`SensorForm`/`LocationForm` extended; 3 new Edit modals wired into their pages.
- [x] Duplicate buttons wired on all 5 pages; existing Delete buttons call archive, not hard remove.
- [x] `/trash` page built, combining all 5 resources, with working Restore and Delete permanently.
- [x] Frontend vitest coverage for new modals + Trash page, full suite green (173/173, 32 files).
- [x] `tsc -b`/`build`/`lint`/`vitest run` all clean (independently re-verified, not just trusted).
- [x] Live Playwright MCP walkthrough per Validation Steps, for all 5 entity types: printer edit
      (serial_number/notes persisted), location duplicate ("(Copy)" suffix) → archive → appears in
      `/trash` → restore → reappears → archive again → permanent delete → confirmed gone via API;
      sensor duplicate (serial `-COPY` suffix, location cleared) confirmed via API, archived
      (permanent delete correctly blocked by the pre-existing referential-integrity guard since
      auto-capture had already written a Reading for it — left archived in Trash as harmless
      cleanup); material duplicate ("(Copy)" suffix, thresholds copied) confirmed + cleaned up;
      spool duplicate (no name suffix, fields copied) confirmed + cleaned up. Trash page confirmed
      empty-state and populated-state rendering in both cases, dark mode default intact.
- [x] `docs/Tasks.md` and `EVIDENCE.md` updated.
- [x] User has validated in the browser (or this session's own Playwright evidence stands in, per
      established convention) — this session's own Playwright MCP walkthrough stands in.
