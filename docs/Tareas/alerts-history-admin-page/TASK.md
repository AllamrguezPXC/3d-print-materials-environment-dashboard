# Alerts history admin page

## Objective

Close a real requirements gap: `docs/Requirements.md` §12.2 requires `GET /alerts` and
`PATCH /alerts/{alert_id}/resolve`, and the `Alert` model has `is_active`/`resolved_at` fields
built specifically for this lifecycle — all fully implemented and tested on the backend
(`backend/app/api/v1/alerts.py`, `backend/app/services/alert_admin_service.py`,
`backend/tests/api/test_alerts.py`). But the frontend has zero consumer for it: no
`frontend/src/api/alerts.ts`-equivalent client, and the only alert UI (`AlertPanel.tsx`) shows
just the transient `alerts` array embedded in `GET /readings/current` per sensor — never the
persisted alert history, and there is no page or button anywhere that calls `resolve`. Alerts
accumulate in the database forever with no UI path to acknowledge/resolve them.

## Context

Picked at Claude's own discretion in response to "Continua con lo restante," after an Explore
agent audited `docs/Requirements.md` end-to-end for gaps beyond the two already-known deferred
items (sensor-inheritance UI, `MaterialProfile` nozzle/bed-temp fields — both judged out of scope
for reasons independent of missing backend work). This is the same class of gap as the
manufacturer-override chain fixed in the previous task: a documented, endpoint-backed requirement
with no consuming code. A secondary, lower-priority gap was also found (§11.6: no sensor-reading
trend chart wired into the Drying page for an in-progress session) — deferred, noted in
`docs/Frontend_Redesign_Guide.md`, since this task is scoped to the alert-resolution gap only.

## Scope

Dentro: `frontend/src/api/config.ts`'s `alertsApi` (list with `is_active`/`severity`/`location_id`
filters, `resolve`), `frontend/src/hooks/resources/alerts.ts`, a new `/alerts` page listing
persisted alert history with status/severity filters and a "Resolve" button per active alert,
route + nav item, `types/api.ts`'s `AlertResolveResponse` type (reusing the existing `AlertOut`
type for list items — already matches the backend's `AlertRead` schema exactly), vitest coverage.

Fuera: the §11.6 drying-session trend chart gap (separate, smaller task if picked up later);
changing `AlertPanel.tsx`'s existing per-sensor embedded-alerts display on the Dashboard (still
correct and useful for "what's wrong right now" — this new page is for history/acknowledgment,
a different job); bulk-resolve or alert-deletion (not in Requirements.md, would be scope creep).

## Files & Modules Involved

- `frontend/src/types/api.ts`
- `frontend/src/api/config.ts`
- `frontend/src/hooks/resources/alerts.ts` (new)
- `frontend/src/pages/Alerts.tsx` (new)
- `frontend/src/pages/Alerts.test.tsx` (new)
- `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`
- `docs/Frontend_Redesign_Guide.md`, `docs/Tasks.md`, `EVIDENCE.md`

## Implementation Steps

1. `types/api.ts`: add `AlertResolveResponse { alert: AlertOut }`.
2. `api/config.ts`: add `alertsApi.list(params?)` (mapping to `is_active`/`severity`/`location_id`
   query params) and `alertsApi.resolve(id)` (`PATCH /alerts/{id}/resolve`, empty body — the
   endpoint declares no request body).
3. `hooks/resources/alerts.ts`: `useAlerts(params?)` (plain `useQuery`, not `createResourceHooks`
   since this resource is list+resolve only, no create/update/remove) and `useResolveAlert()`
   (mutation invalidating `"alerts"`).
4. `Alerts.tsx`: status filter (All/Active/Resolved), severity filter (All/info/warning/critical),
   a table (Severity badge, Metric, Message, Recommended action, Location — resolved via
   `useLocations()` + `.find()`, Created at, Status, Resolve button for active rows).
5. Route `/alerts` in `App.tsx`; nav item in `Layout.tsx` (icon: `Bell`, matching the existing
   lucide-react icon set already used for every other nav item).
6. `Alerts.test.tsx`: empty state, rendering alerts with correct badges, resolving an alert calls
   the mutation and the row updates.
7. Validate: `pytest` (no backend changes, confirm no regressions), `tsc -b`/`build`/`lint`/`vitest
   run`, Playwright manual verification (trigger an alert via `POST /readings`, see it on `/alerts`,
   resolve it, confirm it moves to "Resolved").

## Validation Steps

1. `cd backend && pytest -q` — no regressions (no backend files touched).
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test` — all clean.
3. Playwright MCP: trigger a humidity alert (post a high-RH manual reading against a spool's
   location), navigate to `/alerts`, confirm it appears with "Active" status; click "Resolve",
   confirm it moves to resolved and the Resolve button disappears for that row.

## Validation Result

Live end-to-end check: triggered a critical humidity alert + a bonus warning dew-point alert via
`POST /readings` (90% RH against the seeded PLA spool's location), navigated to `/alerts` and
confirmed both rendered with correct severity badges, resolved location name, and "Active" status
(`evidence/frontend-verification/alerts-page-active.png`). Clicked "Resolve" on the humidity alert
— it correctly switched to a green "Resolved" badge with no Resolve button, while the dew-point
alert remained Active (`evidence/frontend-verification/alerts-page-resolved.png`).

## Completion Criteria

- [x] `alertsApi` (list + resolve) and `useAlerts`/`useResolveAlert` hooks
- [x] `Alerts.tsx` page: filters, table, resolve action
- [x] Route + nav item wired in
- [x] `Alerts.test.tsx` covers empty state, rendering, and resolve behavior
- [x] `pytest`/`tsc -b`/`build`/`lint`/`vitest run` all clean
- [x] Playwright verification complete
- [x] Docs updated (`Frontend_Redesign_Guide.md`, `Tasks.md`, `EVIDENCE.md`)
