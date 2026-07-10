# Frontend Redesign Guide

This document explains the visual/structural redesign of the frontend (Tailwind CSS + shadcn/ui +
TanStack Query + lucide-react), why each library was added, how the new architecture is organized,
and how to extend it going forward. It complements `CLAUDE.md`'s "Frontend Conventions" section —
those conventions still hold; this guide covers what changed underneath them.

## 1. Motivation

An audit of the pre-redesign frontend (see `docs/Tareas/frontend-redesign-tailwind-shadcn/TASK.md`)
found concrete, not just cosmetic, problems:

- `Printers.tsx`, `Materials.tsx`, and `Spools.tsx` each hand-rolled an identical
  `useEffect(refresh)` + try/catch/notify pattern, repeated across 8 mutation handlers.
- Severity-badge class logic (`ok`/`warning`/`critical` → CSS class) was copy-pasted in 4 different
  components.
- Zero icon library; layout relied on scattered inline `style={{}}` objects instead of reusable
  utility classes.
- `docs/Requirements.md` §14.2's suggested components (`PrinterForm`, `MaterialProfileForm`,
  `SpoolAssignmentForm`) were never extracted — everything lived inline in page files.
- The `/drying` page only showed read-only recommendations; `docs/Requirements.md` §11.6's drying
  *session* workflow (start/track/complete) was never built, even though the backend already
  supported it end-to-end.

## 2. New libraries and what they replace

| Library | Purpose | Replaces |
|---|---|---|
| `tailwindcss` (v4) + `@tailwindcss/vite` | Utility-first styling, no separate PostCSS/config file needed in v4 | ~170 lines of hand-written component CSS + scattered inline `style={{}}` |
| `shadcn/ui` (Radix UI + `class-variance-authority` + `clsx` + `tailwind-merge`, generated into `src/components/ui/`) | Accessible Card/Badge/Select/Dialog/Tabs/Table/Button/Input/Label/Textarea/Tooltip primitives | Native `<select>`/`<table>`, 4 duplicated badge-class functions |
| `@tanstack/react-query` | Server-state fetching, caching, mutations, polling via `refetchInterval` | The custom `usePolling` hook (removed) and every hand-rolled `useEffect(refresh)` pattern |
| `lucide-react` | Icon set (installed automatically by `shadcn init`'s Nova preset) | No icons existed before |
| `tw-animate-css` | Tailwind v4 animation utilities backing shadcn's Dialog/Select open-close transitions | N/A (new capability) |
| `@fontsource-variable/geist` | Self-hosted Geist variable font (bundled by the Nova preset) | System-ui default font stack |

**Explicitly evaluated and rejected:**

- **Framer Motion** — shadcn's components already ship working enter/exit transitions via
  `tw-animate-css`; a full animation library would add real weight for interactions that don't
  need spring physics or gesture handling.
- **Zustand** — no state needed it. Server state lives in TanStack Query's cache; the only client
  state is `useTheme` (already solid) and ordinary per-page component state (form drafts, dialog
  open/closed).
- **react-hook-form / zod** — the existing controlled-input forms (`useState` + `onChange`) are
  small and simple enough that a form library would be net-negative complexity for this app's size.

## 3. Architecture

```
frontend/src/
  components/ui/        shadcn-generated primitives (Button, Card, Badge, Select, Dialog, Table,
                         Tabs, Input, Label, Textarea, Tooltip, Separator) — edited in place when
                         needed (e.g. Badge's cva variants extended with ok/warning/critical),
                         otherwise left as generated.
  components/            App-specific components: StatusBadge, ReadingCard, AlertPanel,
                         AffectedSpoolsPanel, DryingRecommendationCard, HistoryChart, Layout,
                         ThemeToggle, NoticeBanner, PrinterForm, LocationForm, MaterialProfileForm,
                         SpoolForm, SpoolAssignmentForm, DryingSessionForm, DryingSessionsTable.
  hooks/
    useTheme.ts          Unchanged — dark/light via `data-theme` attribute on <html>.
    useNotice.ts          Unchanged — local success/error banner state, now rendered by the
                         restyled NoticeBanner.
    useRefreshInterval.ts New — reads the Settings-configured polling interval once per Dashboard
                         mount (fixes a pre-existing dead setting, see section 6).
    useResource.ts        New — `createResourceHooks(queryKey, api, options?)` factory wiring a
                         resource's list/create/update/remove API functions to TanStack Query.
    resources/*.ts        One thin file per resource (printers, locations, materials, spools,
                         assignments, drying) instantiating the factory / custom drying hooks.
  lib/
    utils.ts             shadcn's `cn()` class-merging helper (generated).
    status.ts             New — the single `statusVariant()` map covering every status/severity
                         string used anywhere in the app (alerts, spools, drying sessions).
    queryClient.ts        New — the shared `QueryClient` instance, provided in `main.tsx`.
  api/                   Unchanged shape — client.ts (fetch wrapper), readings.ts, config.ts
                         (per-resource API modules; `dryingApi.sessions.*` added for the new
                         session workflow).
  types/api.ts            Unchanged shape — `DryingSession{Create,Update,Read}` types added.
```

### The `useResource` pattern

Before, each CRUD page (Printers/Materials/Spools) duplicated this shape:

```tsx
const [items, setItems] = useState<T[]>([]);
useEffect(() => { refresh(); }, []);
async function refresh() { try { setItems(await api.list()); } catch (e) { notifyError(...); } }
async function handleCreate() { try { await api.create(x); notifySuccess(...); refresh(); } catch (e) { notifyError(...); } }
// ...repeated for update/delete
```

Now, one factory call per resource replaces all of it:

```ts
// hooks/resources/printers.ts
const hooks = createResourceHooks<Printer>("printers", printersApi);
export const usePrinters = hooks.useList;
export const useCreatePrinter = hooks.useCreate;
export const useUpdatePrinter = hooks.useUpdate;
export const useRemovePrinter = hooks.useRemove;
```

```tsx
// Printers.tsx
const { data: printers = [] } = usePrinters();
const createPrinter = useCreatePrinter();
createPrinter.mutate(body, { onSuccess: () => notifySuccess("..."), onError: (e) => notifyError(e.message) });
```

The factory handles query caching and invalidation; the page only supplies the user-facing success
message (which is inherently page-specific text, not resource-specific logic). Mutating a resource
automatically invalidates its own query key plus anything declared in `options.invalidates` — e.g.
creating a `SpoolAssignment` also invalidates `"spools"`, since assigning a spool changes what
location it displays as current.

## 4. Theme system

Dark mode is still the default, driven by a `data-theme` attribute on `<html>` (`useTheme.ts`,
unchanged). What changed is the token *names*: the original 9 custom variables (`--bg`,
`--bg-elevated`, `--text`, `--text-muted`, `--accent`, `--ok`, `--warning`, `--critical`,
`--shadow`) were renamed/extended to shadcn's standard token set (`--background`, `--card`,
`--foreground`, `--muted-foreground`, `--primary`, `--destructive`, `--border`, `--input`,
`--ring`, plus `--chart-1..5` and `--sidebar-*`), so every shadcn-generated component (which
references `bg-background`, `text-muted-foreground`, etc.) picks up this app's color identity
instead of shadcn's default neutral palette. `--ok`/`--warning` were kept as first-class custom
tokens since shadcn has no built-in equivalent severity colors.

`@custom-variant dark (&:is([data-theme="dark"] *));` in `index.css` tells Tailwind's `dark:`
variant to key off the same `data-theme` attribute instead of the `.dark` class shadcn assumes by
default — this was the one adjustment needed to make shadcn's dark-mode-aware utilities work with
the existing theme mechanism.

Recharts colors in `HistoryChart` now reference `var(--chart-1)` etc. directly instead of
hardcoded hex, so history charts re-theme automatically between dark and light mode.

## 5. Status representation

Every status or severity string in the app (`AlertOut.severity`, `DryingRecommendation.current_status`,
`FilamentSpool.status`, `DryingSession.status`) is rendered through one component:

```tsx
<StatusBadge status={alert.severity} />
```

`StatusBadge` (`components/StatusBadge.tsx`) looks up the color via `lib/status.ts`'s
`STATUS_VARIANT_MAP` — a single source of truth mapping every known status string to one of the
Badge's `ok`/`warning`/`critical`/`secondary` variants. **When a new status value is introduced,
add it to this map** — do not write another local badge-class function.

## 6. Alerts and the Settings → Dashboard refresh-interval fix

`AlertPanel` and `AffectedSpoolsPanel` render inside a `Card`/`Table`, using `StatusBadge` for
severity. No behavior change from before — just the visual system.

Separately, this redesign fixed a pre-existing bug: `Settings.tsx` wrote a refresh interval to
`localStorage` that `Dashboard.tsx` never read (it hardcoded `3000`). `useRefreshInterval()` now
reads that stored value once per Dashboard mount and passes it as the `current-reading` query's
`refetchInterval`, matching the "applies on next Dashboard page load" copy already shown in
Settings.

## 7. New feature: Drying session workflow

`docs/Requirements.md` §11.6 describes a drying *session* workflow (start, monitor, complete) that
was never built in the frontend — the backend (`POST/GET /drying/sessions`,
`PATCH /drying/sessions/{id}`) already supported it, fully tested (87 backend tests). This redesign
adds the missing UI, with no backend changes:

- **Start a session**: the "New session" button, or a recommendation card's "Start drying session"
  button (which pre-fills spool/dryer/target values from that recommendation), opens a `Dialog`
  containing `DryingSessionForm` — spool select, dryer-location select (only `location_type ===
  "dryer"` locations), optional monitoring sensor, target temperature/duration.
- **Track sessions**: `DryingSessionsTable` lists all sessions with a status filter, showing spool,
  dryer, sensor, target, start time, and a `StatusBadge`.
- **Transition status**: a frontend-only state machine gates which transitions are offered per
  row — `recommended → running | cancelled`, `running → completed | failed | cancelled`; the three
  terminal statuses show no further action. Confirming a transition opens a small dialog for the
  new status plus optional validation notes, then calls `PATCH /drying/sessions/{id}`.

As with the existing recommendations, every session-related message continues to state the app
does not control the dryer directly — this is validation/tracking only.

## 8. Extending the component system

- **New status value**: add one line to `STATUS_VARIANT_MAP` in `lib/status.ts`.
- **New shadcn component**: `npx shadcn@latest add <name>` from `frontend/`; it lands in
  `components/ui/` using the existing token names automatically.
- **New CRUD resource**: add its API module to `api/config.ts`, then one file under
  `hooks/resources/` calling `createResourceHooks(...)`. Extract a `<Resource>Form` component if
  the create/edit form has more than a couple of fields (see `PrinterForm`/`MaterialProfileForm`
  for the pattern: controlled `value`/`onChange`/`onSubmit` props, no internal data-fetching).
- **New icon**: import directly from `lucide-react`; no wrapper needed.

## 9. Known limitations / deferred ideas

- **`SensorStatusGrid`** (suggested by Requirements.md §14.2) — superseded. `GET /readings/current`
  now returns one entry per active sensor (see `docs/Tareas/eliminar-sensor-mode-global/`), and the
  per-sensor `SensorReadingSection` cards on Dashboard satisfy the original need. The `/sensors`
  admin CRUD page (`pages/Sensors.tsx`), previously listed here as deferred, is now built as part of
  `docs/Tareas/printer-ams-sensor-config/TASK.md`, including serial-port detection and test-read.
- No live sensor-trend chart *during* an active drying session — Requirements §11.6 only asks to
  "review measured trend," which the existing `/history` page (filterable by sensor/location)
  already covers well enough for this MVP.
- No `react-hook-form`/`zod` — forms are simple `useState` objects; revisit only if a form grows
  complex cross-field validation.
- The main JS bundle is ~808 kB (Vite warns above 500 kB) — acceptable for a local-first assignment
  app; code-splitting via route-based `React.lazy()` would be the next step if bundle size ever
  becomes a real concern.
- **Deferred from `docs/Tareas/printer-ams-sensor-config/TASK.md` (Phase 1 of the Bambu-Studio-inspired
  printer/AMS/filament redesign)** — not built, by explicit scope decision against this project's
  "keep the MVP focused" constraint:
  - ~~Full "Filament Manager" redesign (filters/search/grouping)~~ — **done**, see
    `docs/Tareas/filament-manager-redesign/TASK.md`: `FilamentFilters` (scope All/AMS/Storage,
    brand, material type, filament type, status, search) + optional grouping (location/printer/
    material) + Edit/Delete actions, still on the existing (proven, accessible) table, not a card
    grid. ("Add Filament" itself — Manual Add + Read from AMS — was built earlier; see
    `docs/Tareas/read-from-ams-flow/TASK.md`. Read from AMS reads the AMS slots this project
    already tracks explicitly (`Location.slot_index`), not any real Bambu Studio/AMS integration.)
  - Sensor-inheritance resolution UI (printer → AMS → slot → location) — a slot's sensor is whatever
    sensor row has that slot's `location_id`, resolved implicitly, not surfaced as an explicit chain.
  - `MaterialProfile` nozzle/bed print-temperature fields and a manufacturer-override chain — the
    model remains environmental/drying-only; no schema migration tool exists to add these safely yet.
  - ~~A `Printer`-level filament-system-type selector (AMS / External Spool / Storage-only / Manual)~~
    — **done**, see `docs/Tareas/printer-filament-system-type/TASK.md`: `Printer.filament_system_type`
    (validated enum, default `"manual"`), editable via `PrinterForm`, shown as a column in
    `Printers.tsx` and in the header of `PrinterDetail.tsx`. Purely descriptive configuration — it
    does **not** change the existing AMS-grid inference, which remains based on whether
    `printer_ams`-typed `Location` rows exist for that printer (two sources of truth for "has AMS"
    was explicitly avoided).
  - ~~A color picker for filament color~~ — **done**, see `docs/Tareas/filament-color-swatch/TASK.md`:
    `ColorSwatchPicker` (text input + live preview + a row of common filament color presets that
    just fill the same field) and a `ColorSwatch` display component wherever a color name already
    rendered (`Spools.tsx` table, `AmsSlotButton`). Still a free-text string underneath (no hex
    column exists) — the swatch is a best-effort color-name-to-CSS guess (`lib/colorSwatch.ts`),
    with a neutral outline ring for anything unrecognized rather than fabricating a color. No new
    dependency added.

## 10. Migration notes for contributors

- `index.css` no longer contains any hand-written component CSS — everything is Tailwind utility
  classes on components, plus the token/`@theme` block at the top.
- The old CSS class names (`.card`, `.badge*`, `.sidebar`, `.topbar`, `.empty-state`,
  `.error-state`, `.notice-success`, `.theme-toggle`, bare `table`/`input`/`select`/`button.primary`
  rules) no longer exist. Do not reintroduce plain CSS classes for new UI — use Tailwind utilities
  and shadcn components instead, consistent with the rest of the app.
- `usePolling.ts` was removed (superseded by TanStack Query's `refetchInterval`).
