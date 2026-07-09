# Frontend

React + TypeScript + Vite dashboard for the 3D Print Materials Environment Data Monitoring
Dashboard. See the root `README.md` for full setup instructions.

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
```

## Routes

`/` Dashboard · `/history` · `/printers` · `/materials` · `/spools` · `/drying` · `/settings`
