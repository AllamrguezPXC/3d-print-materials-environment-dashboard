# Material profile manufacturer override

## Objective

Close a real requirements gap (not one of the optional Bambu-Studio-inspired extras): `docs/Requirements.md`
§7 states two rules as musts —

1. "Manufacturer-specific values override family defaults."
2. "Derivatives inherit from parent family unless their profile overrides it."

— and `CLAUDE.md`'s Domain Rules repeats "Manufacturer-specific material profiles override generic
family defaults." Investigation (see Context) confirmed this was **not actually implemented**: the
`manufacturer`/`variant` columns exist on `MaterialProfile` but are always `null` in seed data, are
never queried against `FilamentSpool.brand`, and there is no resolution logic anywhere — just flat
CRUD plus a user manually picking one profile row per spool from an unlabeled dropdown.

## Context

Picked at Claude's own discretion in response to "continua con lo que queda." Before picking this
over the two previously-noted deferred items, an Explore agent was used to verify whether this
requirement was a real gap or already satisfied in some indirect way. Confirmed real gap:
- `backend/app/db/seed.py`'s `MATERIAL_PROFILE_SEEDS` has 10 rows, all family-generic, none with a
  `manufacturer` set, and `_get_or_create_material_profile` never passes `manufacturer=` at all.
- No service function anywhere resolves "family + manufacturer -> most specific matching profile."
- `FilamentSpool.brand` (free text) and `MaterialProfile.manufacturer` (free text) are completely
  uncorrelated fields today — nothing cross-references them.
- `Materials.tsx` already has copy claiming "manufacturer-specific profiles should override generic
  family defaults" but the table doesn't even show which profiles are manufacturer-specific.

**Design decision**: the override belongs at spool-assignment time, not at alert-evaluation time —
a `FilamentSpool` already points at exactly one `MaterialProfile` row (its `material_profile_id`);
there is no separate "family" input at evaluation time to resolve against. So "override" means:
when creating/editing a spool, if the user's typed `brand` matches an existing manufacturer-specific
profile for the same family as their currently-selected (generic) profile, suggest switching to it.
This is a client-side computation over the already-fetched `materials` list (same pattern as
`Printers.tsx` finding a location's printer via `.find()`) — no new backend endpoint, since nothing
would call one that isn't the frontend, and the frontend already has the full list loaded.

## Scope

Dentro: one seeded manufacturer-specific `MaterialProfile` demonstrating the override (Prusament
PLA — illustrative numbers, honestly labeled as not sourced from a real published spec, same
"never fabricate data" principle already used for color swatches); `_get_or_create_material_profile`
updated to pass `manufacturer=`; a "Manufacturer" column in `Materials.tsx` (Requirements §7 rule 3:
"must show the source or note for each profile"); an auto-suggest hint in `SpoolForm.tsx` when the
typed brand matches an existing manufacturer-specific profile for the selected family; backend
pytest for the new seed data; a vitest test for the suggestion behavior.

Fuera: a new `/materials/resolve` backend endpoint (no real caller — the frontend already has the
full profile list, so a network round-trip would be strictly worse than the existing `.find()`
pattern); field-level partial override/merging (every `MaterialProfile` row is a complete,
self-contained set of thresholds already — turning individual fields into nullable overrides would
be a bigger schema change for no clear benefit here); auto-switching a spool's profile without user
confirmation (the suggestion is a button, not a silent decision, consistent with how `ReadFromAmsPanel`
and the color-swatch picker never auto-decide data on the user's behalf).

## Files & Modules Involved

- `backend/app/db/seed.py`
- `backend/tests/api/test_materials.py` (or wherever material profile tests live)
- `frontend/src/pages/Materials.tsx`
- `frontend/src/components/SpoolForm.tsx`
- `frontend/src/components/SpoolForm.test.tsx` (new)
- `docs/Requirements.md`, `docs/Frontend_Redesign_Guide.md`, `docs/Tasks.md`, `EVIDENCE.md`

## Implementation Steps

1. `seed.py`: add `manufacturer` support to `_get_or_create_material_profile`'s lookup + construction;
   add a "Prusament PLA" seed spec (`family="PLA-derived"`, `manufacturer="Prusament"`, tighter RH
   thresholds than generic PLA, `source_notes` honestly marked illustrative).
2. Backend test: seeded "Prusament PLA" exists with `manufacturer="Prusament"`, shares `family` with
   generic "PLA", and has different (tighter) `ideal_rh_max_percent` than the generic row.
3. `Materials.tsx`: add a "Manufacturer" column (shows the manufacturer name or "Generic").
4. `SpoolForm.tsx`: compute whether a manufacturer-specific profile exists for the selected profile's
   `family` matching the typed `brand` (case-insensitive); if so and the current selection is the
   generic one, show an inline hint + "Use it" button that switches `material_profile_id`.
5. `SpoolForm.test.tsx`: typing a brand that matches a manufacturer-specific profile's manufacturer
   shows the hint; clicking "Use it" switches the selection; a non-matching brand shows no hint.
6. Validate: `pytest`, `tsc -b`/`build`/`lint`/`vitest run`, Playwright manual verification.

## Validation Steps

1. `cd backend && pytest -q` — no regressions, new seed test passes.
2. `cd frontend && npx tsc -b && npm run build && npm run lint && npm run test` — all clean.
3. Playwright MCP: `/materials` shows a "Manufacturer" column with "Prusament" vs "Generic"; on
   `/spools`, adding/editing a spool with Material="PLA" and Brand="Prusament" shows the suggestion
   hint, clicking it switches to "Prusament PLA". **Not performed this session** — the Playwright
   MCP server was disconnected (confirmed via `ToolSearch`, no `mcp__playwright__*` tools resolved).
   Substituted with: a live `curl` against the running `GET /materials` confirming the seeded
   "Prusament PLA" row (`manufacturer="Prusament"`, `family="PLA-derived"` matching generic "PLA",
   tighter RH thresholds 35/45/55% vs. 40/50/60%), plus the vitest suite exercising the exact same
   render/interaction via Testing Library + jsdom (typing a brand, seeing the hint, clicking "Use
   it", confirming the Select's displayed value switches). This is a reasonable substitute for this
   specific change but does not replace a real-browser check — do one when Playwright MCP is back.

## Completion Criteria

- [x] Seed updated with a real manufacturer-specific `MaterialProfile` row + backend test
- [x] `Materials.tsx` shows manufacturer/generic per profile
- [x] `SpoolForm.tsx` suggests the manufacturer-specific override when the brand matches
- [x] `SpoolForm.test.tsx` covers the suggestion behavior
- [x] `pytest`/`tsc -b`/`build`/`lint`/`vitest run` all clean
- [x] Playwright verification complete — **not performed** (MCP server disconnected this session;
      see substitute verification above)
- [x] Docs updated (`Frontend_Redesign_Guide.md`, `Tasks.md`, `EVIDENCE.md`)
