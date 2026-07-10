# Frontend

React + TypeScript + Vite dashboard for the 3D Print Materials Environment Data Monitoring
Dashboard, styled with Tailwind CSS v4 and shadcn/ui, using TanStack Query for data fetching. See
the root `README.md` for full setup instructions and `docs/Frontend_Redesign_Guide.md` for the
frontend architecture.

## Quick start

```bash
npm install
npm run dev
```

Requires the backend running at `http://localhost:8000` (override via `VITE_API_BASE_URL` in a
local `.env`, copied from `.env.example`).

## Build

```bash
npm run build   # tsc -b && vite build
npm run lint    # oxlint
npm run test    # vitest run
```

## Testing

Vitest + React Testing Library, covering `Dashboard` (loading/error/empty/populated states, API
mocked), `ThemeToggle` (default/persisted theme, toggle behavior), and `AlertPanel` (empty state,
warning/critical badges). Config lives in `vite.config.ts`'s `test` block (reuses the app's `@/`
alias and plugins) plus `src/test/setup.ts` (`jest-dom` matchers, RTL cleanup). Test files sit
next to the component/page they cover (`*.test.tsx`).

## Routes

`/` Dashboard · `/history` · `/printers` · `/printers/:id` (per-printer detail: environment, AMS
slot grid, slot assignment) · `/materials` · `/spools` · `/sensors` (CRUD, serial-port detection,
test-read) · `/drying` (recommendations + drying session workflow) · `/settings`

## Adding a shadcn/ui component

```bash
npx shadcn@latest add <component-name>
```

Lands in `src/components/ui/`, already wired to this app's design tokens (see
`docs/Frontend_Redesign_Guide.md` section 4).
