# Configuración de impresora: tipo de sistema de filamento

## Objective

Agregar `Printer.filament_system_type` (AMS / External Spool / Storage-only / Manual) como
atributo de configuración editable de cada impresora — el último ítem restante de la lista de
Fase 2+ que no requiere una cadena de override compleja, elegido a discreción tras confirmar con
el usuario que continuara "con el que consideres mejor".

## Context

El prompt original pedía una sección de "Configuración de impresoras" que incluyera "Tipo de
sistema de filamento: AMS / External Spool / Storage-only / Manual". Esto quedó diferido en
`docs/Frontend_Redesign_Guide.md` §9 porque `Printer` no tenía esa columna y "hoy se infiere de
si existen filas `Location` tipo `printer_ams` para esa impresora."

**Decisión de diseño clave**: este campo se agrega como metadato descriptivo/editable, **sin**
cambiar la lógica ya construida y verificada que infiere el grid AMS a partir de las filas
`Location` (`AmsSlotGrid`, `ReadFromAmsPanel`, `PrinterDetail`). Mezclar ambas fuentes de verdad
(un campo de configuración editable por un lado, filas `Location` reales por otro) crearía un
riesgo real de inconsistencia (ej. una impresora marcada "AMS" sin slots configurados, o
viceversa) sin necesidad — el grid AMS ya funciona correctamente basado en datos reales
existentes. `filament_system_type` es puramente informativo/configuración, mostrado en las
pantallas de impresora, y no gatea ninguna otra lógica.

## Scope

Dentro: `backend/app/models/printer.py` (+schema, +validación enum simple en
`printer_service.py`), seed con valores consistentes con las AMS ya sembradas (A1 mini #1 y
P1S #1 → `ams`, el resto → `external_spool`), `frontend/src/types/api.ts`, `PrinterForm.tsx`
(nuevo select), `Printers.tsx` (columna nueva), `PrinterDetail.tsx` (mostrado en el header).

Fuera: cambiar la lógica de inferencia de AMS ya construida (sigue basada en `Location` rows);
cadena de override de `MaterialProfile` (ítem restante, mucho más complejo, sin UI consumidora
aún — queda diferido).

## Files & Modules Involved

- `backend/app/models/printer.py`, `backend/app/schemas/printer.py`
- `backend/app/services/printer_service.py` (validación enum)
- `backend/app/db/seed.py`
- `backend/tests/api/test_printers.py`
- `frontend/src/types/api.ts`
- `frontend/src/components/PrinterForm.tsx`
- `frontend/src/pages/Printers.tsx`
- `frontend/src/pages/PrinterDetail.tsx`

## Implementation Steps

1. `Printer.filament_system_type: str` (default `"manual"`), validado contra
   `{"ams", "external_spool", "storage_only", "manual"}` en create/update (422 si inválido).
2. Seed: `A1 mini #1`/`P1S #1` → `"ams"` (coincide con sus AMS ya sembradas); resto → `"external_spool"`.
3. Frontend: tipo actualizado, select en `PrinterForm`, columna en `Printers.tsx`, mostrado en
   `PrinterDetail.tsx` junto a marca/modelo.
4. Validaciones: `pytest`, `tsc -b`/`build`/`lint`, Playwright manual (crear impresora con cada
   tipo, ver columna en la tabla y en el detalle, confirmar que un tipo inválido vía API da 422).

## Validation Steps

1. `cd backend && pytest -q` sin regresiones.
2. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
3. Playwright MCP: `/printers` muestra la columna "Filament System"; `/printers/1` (A1 mini #1)
   muestra "AMS" en el header; crear una impresora nueva eligiendo "Storage-only" y confirmar
   que se guarda y se muestra correctamente.

## Completion Criteria

- [x] `Printer.filament_system_type` implementado y validado (backend)
- [x] Seed actualizado con valores consistentes
- [x] Frontend: tipo, `PrinterForm`, columna en `Printers.tsx`, header de `PrinterDetail.tsx`
- [x] `pytest`/`tsc -b`/`build`/`lint` limpios
- [x] Verificación Playwright completa
