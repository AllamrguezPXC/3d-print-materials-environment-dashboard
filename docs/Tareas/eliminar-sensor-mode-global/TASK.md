# Eliminar SENSOR_MODE global → configuración de sensores por fila en BD

## Objective

Reemplazar el toggle global `SENSOR_MODE` (que hoy decide, para todo el proceso, si `GET /readings/current` y `POST /readings` leen de un único `SensorReader`) por configuración explícita por fila en la tabla `sensors`. `GET /readings/current` debe devolver una lista (una entrada por sensor activo, con error aislado si falla), `POST /readings` debe persistir por sensor, y nunca debe sintetizarse una lectura si no hay sensores configurados. Un sensor mock nunca debe poder reportar el serial real `E25877`.

## Context

Auditoría (3 agentes Explore) confirmó: (1) bug de identidad — el único `MockSensorReader` global se siembra con el serial real `E25877`; (2) el modelo `Sensor` y su CRUD YA existen y el seed YA crea filas idempotentes (1 real + 3 mock `MOCK-000x`), pero el runtime de `/readings/current` y `/readings` POST ignora esa tabla salvo enriquecimiento best-effort; (3) sin sensores configurados, hoy siempre se inventa una lectura — nunca hay un estado "vacío" real. Plan completo y aprobado en modo Plan: ver historial de la conversación (plan guardado en `.claude/plans/lee-docs-requirements-md-docs-tasks-md-d-adaptive-firefly.md`).

## Scope

Dentro: `backend/app/core/config.py`, `backend/app/sensors/factory.py`, `backend/app/services/{environment_service,reading_service,sensor_service}.py`, nuevo `backend/app/services/sensor_validation.py`, `backend/app/schemas/reading.py`, `backend/app/api/v1/readings.py`, `backend/app/db/seed.py`, tests en `backend/tests/`, `frontend/src/{pages/Dashboard.tsx,components/Layout.tsx,api/readings.ts,types/api.ts,pages/Settings.tsx}`, documentación (`docs/Requirements.md`, `docs/Tasks.md`, `CLAUDE.md`, `README.md`, `.env.example`).

Fuera: `GET /readings?from=&to=` (ya soporta `sensor_id`/`location_id`, no cambia), UI de administración CRUD de sensores (diferida, como `SensorStatusGrid`), `persist_manual_reading` (ya cumple "no auto-mock-fallback"), migraciones de esquema (no se agregan columnas nuevas).

## Files & Modules Involved

- `backend/app/core/config.py` — quitar `sensor_mode`
- `backend/app/sensors/factory.py` — `get_sensor_reader_for_sensor(sensor)` reemplaza `get_sensor_reader(settings)`
- `backend/app/services/sensor_validation.py` (nuevo) — `validate_sensor_fields(...)`
- `backend/app/services/sensor_service.py` — wiring de validación (422/400)
- `backend/app/db/seed.py` — llamar al validador
- `backend/app/schemas/reading.py` — `SensorReadingEntry`, `CurrentReadingsResponse`, `ReadingCreateResult`, `ReadingsCaptureResponse`
- `backend/app/services/environment_service.py` — `build_current_readings`
- `backend/app/services/reading_service.py` — `capture_and_persist_all_active_sensors`
- `backend/app/api/v1/readings.py` — rutas GET/POST actualizadas
- `backend/tests/**` — nuevos y reescritos (ver TASK checklist)
- `frontend/src/types/api.ts`, `frontend/src/api/readings.ts`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/Layout.tsx`, `frontend/src/pages/Settings.tsx`
- `docs/Requirements.md`, `docs/Tasks.md`, `CLAUDE.md`, `README.md`, `.env.example`

## Implementation Steps

1. **Fase A** — `sensor_validation.py` + wiring en `sensor_service.create_sensor`/`update_sensor` (422 config inválida, 400 serial duplicado) + wiring en `seed.py`. Extender `test_sensors.py`.
2. **Fase B+C** (atómica) — Nueva factory por sensor + `Settings` sin `sensor_mode` + `build_current_readings` + nuevos schemas + ruta GET reescrita. Nuevos tests de factory/environment_service; reescribir `test_readings_current.py`.
3. **Fase D** — `capture_and_persist_all_active_sensors` + nuevos schemas de captura + ruta POST con union. Reescribir `test_readings_post.py`.
4. **Fase E** — Quitar `SENSOR_MODE` de `.env.example`/`conftest.py`; correr suite completa.
5. **Fase F** — Frontend: tipos, `Dashboard.tsx` (lista + estado vacío + aislamiento de error por sensor), `SystemStatusBadge`, `Settings.tsx`. Verificación Playwright con 0/1/N sensores.
6. **Fase G** — Documentación (Requirements §12.1/§13.3/§13.4/§14.2, Tasks.md, CLAUDE.md línea 66, README.md, .env.example).
7. **Fase H** — Validación final + nota en `EVIDENCE.md`.

## Validation Steps

1. `cd backend && pytest -q` — suite completa en verde, incluyendo `test_readings_history.py` sin tocar como gate de regresión.
2. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
3. Playwright MCP: 4 sensores activos por defecto → 4 secciones; desactivar todos vía `/sensors` → estado vacío; error simulado en un sensor no bloquea los demás.
4. Confirmar manualmente que `POST /readings` (body vacío) persiste una fila por sensor activo, y con cero sensores activos no inserta nada.

## Completion Criteria

- [x] Fase A: validación de `/sensors` (tipo, E25877-en-mock, prefijo MOCK-, puerto dracal, duplicado) implementada y testeada
- [x] Fase B+C: factory por sensor + `GET /readings/current` devuelve lista con aislamiento de errores
- [x] Fase D: `POST /readings` (body vacío) captura/persiste por sensor activo, sin fallback de datos inventados
- [x] Fase E: `SENSOR_MODE` eliminado de config/env/tests; suite backend completa en verde (110 tests)
- [x] Fase F: frontend consume la nueva forma de lista; verificación Playwright con 0/1/N sensores
- [x] Fase G: documentación actualizada (Requirements, Tasks, CLAUDE.md, README, .env.example)
- [x] Fase H: validación final + `EVIDENCE.md` actualizado
