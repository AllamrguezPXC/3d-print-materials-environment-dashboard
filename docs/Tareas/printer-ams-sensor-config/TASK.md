# Vista de estado de impresora + AMS/slots + configuración de sensores (Fase 1)

## Objective

Construir, sin inventar datos ni romper endpoints existentes, una Fase 1 acotada de las vistas inspiradas en Bambu Studio pedidas por el usuario: vista de detalle por impresora, grid visual de slots tipo AMS con datos reales, modal de asignación de slot componiendo forms existentes, escala de humedad DRY→WET (A–E), y configuración/asignación de sensores con detección automática de puertos seriales y lectura de prueba ("test-read").

## Context

El prompt original del usuario (803 líneas, con capturas de Bambu Studio) pedía 17 secciones de funcionalidad. Auditoría (3 agentes Explore + 1 agente Plan) confirmó que hoy no existe ningún concepto de AMS/slot, detección de puertos, ni endpoint de test-read — todo greenfield. Dado el "Important Constraint" de `CLAUDE.md` ("mantener el MVP enfocado, no un sistema sobredimensionado") y tras confirmar con el usuario vía `AskUserQuestion`, se acordó una Fase 1 acotada (ver plan completo en el historial de la sesión de Plan Mode). El resto (rediseño de Filament Manager, flujo "Read from AMS" simulado, expansión de `MaterialProfile` con temps de nozzle/cama, configuración de tipo de sistema de filamento por impresora, color picker) queda diferido como Fase 2+.

## Scope

Dentro: `backend/app/models/location.py` (+schema), `backend/app/api/v1/sensors.py` (+service), `backend/app/db/seed.py`, tests backend correspondientes; `frontend/src/types/api.ts`, `frontend/src/api/config.ts`, `frontend/src/hooks/resources/{sensors,ports}.ts`, nuevos componentes (`AmsSlotGrid`, `AmsSlotButton`, `HumidityScale`, `SlotAssignmentModal`, `PortSelect`), nueva página `PrinterDetail.tsx` y `Sensors.tsx`, rutas en `App.tsx`, nav en `Layout.tsx`; documentación (`docs/Requirements.md`, `docs/Tasks.md`, `README.md`).

Fuera (Fase 2+, diferido): rediseño completo de Filament Manager (filtros/búsqueda), flujo "Read from AMS" simulado, resolución de herencia de sensor impresora→AMS→slot→ubicación, expansión de `MaterialProfile` (temps nozzle/cama + cadena de override por fabricante), configuración de tipo de sistema de filamento por impresora, color picker para filamento.

## Files & Modules Involved

- `backend/app/models/location.py`, `backend/app/schemas/location.py` — columna `slot_index`
- `backend/app/api/v1/sensors.py`, `backend/app/services/sensor_service.py` (o nuevo `sensor_ports.py`) — `GET /sensors/ports`, `POST /sensors/{id}/test-read`
- `backend/app/db/seed.py` — backfill + nuevas locations AMS para P1S #1
- `backend/tests/api/test_locations.py`, `backend/tests/api/test_sensors.py`
- `frontend/src/types/api.ts`, `frontend/src/api/config.ts`
- `frontend/src/hooks/resources/sensors.ts` (nuevo), `frontend/src/hooks/resources/ports.ts` (nuevo)
- `frontend/src/components/{AmsSlotGrid,AmsSlotButton,HumidityScale,SlotAssignmentModal,PortSelect}.tsx` (nuevos)
- `frontend/src/pages/PrinterDetail.tsx` (nuevo), `frontend/src/pages/Sensors.tsx` (nuevo)
- `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`

## Implementation Steps

1. **Fase A** — `Location.slot_index` (modelo+schema), seed (backfill AMS de A1 mini #1 + 3 locations nuevas para P1S #1), extender `test_locations.py`, borrar/recrear BD dev, `pytest -q` verde.
2. **Fase B** — `GET /sensors/ports` + `POST /sensors/{id}/test-read`, tests con mocks de pyserial/factory, `pytest -q` verde.
3. **Fase C** — tipos TS + `api/config.ts` + `hooks/resources/{sensors,ports}.ts`, `npx tsc -b` verde.
4. **Fase D** — `AmsSlotGrid`/`AmsSlotButton`/`HumidityScale` (presentacionales).
5. **Fase E** — `PrinterDetail.tsx` + `SlotAssignmentModal` + ruta `/printers/:id`.
6. **Fase F** — `Sensors.tsx` + `PortSelect` + nav item.
7. **Fase G** — `npm run build && npm run lint`, verificación Playwright MCP.
8. **Fase H** — documentación (Requirements.md, Tasks.md, README.md, sección Fase 2+ diferida).

## Validation Steps

1. `cd backend && pytest -q` — suite completa en verde, sin romper `test_readings_current.py`/`test_readings_post.py`/`test_readings_history.py`.
2. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
3. Playwright MCP: P1S #1 muestra 4 slots reales; impresora sin AMS muestra estado vacío explícito; `/sensors` funcional con detección de puertos y test-read; sensor mock con serial `E27297` sigue rechazado (422).
4. Confirmar que ninguna impresora sin AMS sembrado muestra slots fabricados, y que ningún sensor/lectura se inventa para una ubicación sin sensor activo.

## Completion Criteria

- [x] Fase A: `slot_index` en `Location`, seed backfill + P1S #1 con 4 slots, tests verdes
- [x] Fase B: `GET /sensors/ports` + `POST /sensors/{id}/test-read` implementados y testeados
- [x] Fase C: tipos/API frontend actualizados, `tsc -b` verde
- [x] Fase D: `AmsSlotGrid`/`AmsSlotButton`/`HumidityScale` implementados
- [x] Fase E: `PrinterDetail.tsx` + `SlotAssignmentModal` funcionales
- [x] Fase F: `Sensors.tsx` + `PortSelect` funcionales
- [x] Fase G: build/lint/tsc limpios; verificación Playwright completa
- [x] Fase H: documentación actualizada (Requirements, Tasks, README, sección Fase 2+ diferida)
