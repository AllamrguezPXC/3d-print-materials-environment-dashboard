# Frontend automated tests (Vitest + Testing Library)

## Objective

Close a real, previously-documented gap: `CLAUDE.md`'s own "Testing Commands" section lists
`cd frontend && npx vitest run` as a required command, and `EVIDENCE.md`'s TDD/testing evidence
already references frontend behavior tests — but no Vitest config, no testing-library
dependencies, and no `*.test.*` file have ever existed in `frontend/`. This was tracked as
[GitHub Issue #1](https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard/issues/1)
("Add automated frontend tests (vitest) for Dashboard and theme toggle"), opened earlier this
session as the real GitHub-integration evidence action. Picked now because it is a concrete,
already-documented commitment (not a speculative nice-to-have), unlike the two remaining Phase 2+
backlog items (sensor-inheritance UI — already judged not worth building; `MaterialProfile`
nozzle/bed-temp + override chain — needs a schema migration tool this project doesn't have).

## Context

`CLAUDE.md` → Testing Requirements: "Write tests for new backend behavior (pytest) and, where
practical, frontend behavior" and Testing Commands: `cd frontend && npx vitest run`. The frontend
has never had this tooling. This task installs it and writes the two tests the GitHub issue
promised: the theme toggle (simplest, no network) and the Dashboard page (the app's main screen,
needs API mocking).

## Scope

Dentro: Vitest + `@testing-library/react`/`jest-dom`/`user-event` as dev dependencies, a Vitest
config (extending the existing `vite.config.ts` so the `@/` alias and React plugin are shared, not
duplicated), a `src/test/setup.ts` for `jest-dom` matchers, tests for `ThemeToggle`, `Dashboard`,
and `AlertPanel` (the full acceptance criteria of GitHub Issue #1, checked after implementation
started — the issue also asked for an `AlertPanel` test and for `npm run test` to be documented),
a `"test": "vitest run"` script in `package.json`.

Fuera: a full test suite for every page/component (out of scope for this task — the GitHub issue
only promised Dashboard + theme toggle); E2E/Playwright tests (already covered manually per
`CLAUDE.md`'s Browser Verification section, not being replaced); CI wiring (no CI pipeline exists
in this project yet).

## Files & Modules Involved

- `frontend/package.json` (new devDependencies + `test` script)
- `frontend/vite.config.ts` (add a `test` block, or a co-located `vitest.config.ts` that reuses it)
- `frontend/src/test/setup.ts` (new)
- `frontend/src/components/ThemeToggle.test.tsx` (new)
- `frontend/src/pages/Dashboard.test.tsx` (new)
- `docs/Frontend_Redesign_Guide.md`, `docs/Tasks.md`, `EVIDENCE.md` (doc updates)

## Implementation Steps

1. Read `vite.config.ts`, `Dashboard.tsx`, `useTheme.ts`/`ThemeToggle.tsx`, `api/client.ts`,
   `main.tsx`, and `tsconfig.app.json` to confirm the alias, provider tree, and API shape tests
   need to replicate/mock.
2. Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
   `@testing-library/user-event`, `jsdom` as dev dependencies.
3. Add a `test` config block to `vite.config.ts` (environment `jsdom`, `setupFiles`, globals) so
   the existing `@/` alias and plugins are reused automatically.
4. `src/test/setup.ts` — import `@testing-library/jest-dom/vitest`.
5. `ThemeToggle.test.tsx` — renders default (dark) label/state, click flips to light and persists
   to `localStorage`, re-render with a pre-set `localStorage` value respects it.
6. `Dashboard.test.tsx` — wrap in a real `QueryClientProvider`, mock the API module (not `fetch`
   directly) so the test doesn't depend on the fetch wrapper's internals; cover the loading state,
   a populated-sensor-cards state, and (if present) the error state.
7. Add `"test": "vitest run"` to `package.json` scripts.
8. Run `npx vitest run`, `tsc -b`, `build`, `lint` — all green, no regressions.

## Validation Steps

1. `cd frontend && npx vitest run` — new tests pass.
2. `cd frontend && npx tsc -b && npm run build && npm run lint` — clean.
3. `cd backend && pytest -q` — unaffected, still green (no backend changes in this task).
4. Close GitHub Issue #1 referencing the commit/PR once merged (`gh issue close 1` or note if `gh`
   auth is unavailable in this environment).

## Completion Criteria

- [x] Vitest + Testing Library installed and configured, reusing the existing Vite alias/plugins
- [x] `ThemeToggle.test.tsx` covering default state, toggle behavior, persistence
- [x] `Dashboard.test.tsx` covering at least loading + populated states
- [x] `npx vitest run` / `tsc -b` / `build` / `lint` all clean
- [x] Backend suite unaffected (`pytest -q` still green)
- [x] Docs updated (`Frontend_Redesign_Guide.md`, `Tasks.md`, `EVIDENCE.md`)
- [x] GitHub Issue #1 closed (or noted if `gh` auth unavailable)
