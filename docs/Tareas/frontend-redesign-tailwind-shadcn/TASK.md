# Rediseño Frontend: Tailwind + shadcn/ui + TanStack Query + Sesiones de Secado

## Objective
Rediseñar el frontend completo para que se vea y se sienta como un dashboard moderno de monitoreo de laboratorio/impresión 3D, eliminando duplicación de código real (fetch/refresh/notify repetido 3 veces, badges de severidad copiados 4 veces) y agregando el flujo de sesión de secado que el backend ya soporta pero el frontend nunca consumió.

## Context
Auditoría (agente Explore) confirmó: cero librería de estilos utilitarios/iconos, `style={{}}` inline esparcido, patrón `useEffect(refresh)` + try/catch/notify duplicado en Printers/Materials/Spools (8 handlers), lógica de badge duplicada 4 veces, componentes sugeridos por Requirements.md §14.2 nunca extraídos, bug menor (Settings guarda un intervalo que Dashboard nunca lee), y `/drying` sin el flujo de sesión de Requirements.md §11.6 pese a que el backend ya lo implementa (87 tests pasando). Usuario confirmó adoptar el stack completo (Tailwind + shadcn/ui + TanStack Query + lucide-react) y construir el flujo de sesión de secado.

## Scope
Dentro: todo `frontend/src/**`, `frontend/package.json`, configs de Vite/TS/Tailwind/shadcn, `docs/Frontend_Redesign_Guide.md` (nuevo), `README.md`/`frontend/README.md` (stack), capturas en `evidence/frontend-verification/`.
Fuera: cualquier cambio a `backend/` (el contrato de sesiones de secado ya existe y no se modifica), `SensorStatusGrid` (diferido), `react-hook-form`/`zod`, Framer Motion, Zustand.

## Files & Modules Involved
- `frontend/src/index.css` — migración de tokens a esquema shadcn
- `frontend/src/components/Layout.tsx` — shell + navegación + colapso responsive
- `frontend/src/hooks/useResource.ts` (nuevo) — factory de hooks TanStack Query
- `frontend/src/pages/Drying.tsx` — rediseño + flujo de sesión nuevo
- `frontend/src/api/config.ts` — extensión `dryingApi.sessions`
- `frontend/src/pages/{Dashboard,History,Printers,Materials,Spools,Settings}.tsx`
- `frontend/src/components/{StatusBadge,PrinterForm,MaterialProfileForm,SpoolAssignmentForm,LocationForm,SpoolForm,DryingSessionForm,DryingSessionsTable}.tsx` (nuevos)

## Implementation Steps
1. Scaffolding: instalar Tailwind v4 + shadcn/ui + TanStack Query + lucide-react + tw-animate-css; alias `@/*`; migración aditiva de tokens.
2. Primitivas compartidas: `ui/*` de shadcn, `StatusBadge`, `QueryClientProvider`, `useResource` + hooks por recurso, extensión de `dryingApi`.
3. `Layout.tsx` con iconos + colapso responsive + indicador de estado.
4. Componentes compartidos de visualización.
5. Migración página por página: Dashboard → History → Printers → Materials → Spools → Drying (sesión) → Settings.
6. Limpieza de CSS legacy sin uso.
7. Documentación (`Frontend_Redesign_Guide.md`, READMEs).
8. Verificación final.

## Validation Steps
1. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
2. `cd backend && pytest -q` — 87 tests siguen pasando (no se toca backend).
3. Playwright MCP: navegar cada ruta, ejercer tema/colapso móvil/un CRUD completo/flujo de sesión de secado; refrescar capturas en `evidence/frontend-verification/`.

## Completion Criteria
- [x] Todas las páginas migradas y visualmente rediseñadas
- [x] Duplicación de fetch/refresh/notify eliminada vía `useResource`
- [x] Badges de severidad unificados en `StatusBadge`
- [x] Flujo de sesión de secado funcional end-to-end contra el backend existente
- [x] Bug de intervalo de refresco (Settings→Dashboard) corregido
- [x] Build/typecheck/lint limpios; 87 tests backend intactos
- [x] Verificación Playwright MCP completa con capturas actualizadas
- [ ] `docs/Frontend_Redesign_Guide.md` y READMEs actualizados
