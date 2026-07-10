# Flujo "Read from AMS" en Add Filament

## Objective

Completar el flujo "Add Filament" pedido en el prompt original de rediseño (diferido como Fase 2+):
un modal con dos modos, Manual Add y Read from AMS. El modo Read from AMS permite elegir una
impresora con AMS configurado, ver sus slots (reutilizando los datos ya construidos en
`printer-ams-sensor-config`), seleccionar uno o varios slots **vacíos**, y crear+asignar un
filamento a cada uno en un solo paso — sin fabricar ninguna detección de hardware que no existe.

## Context

El prompt original de Bambu Studio pedía un modal "Add Filament" con tabs "Manual Add"/"Read from
AMS", donde el segundo modo lee slots detectados de una impresora/AMS. Este proyecto no tiene
integración real con Bambu Studio/AMS — la única fuente de verdad sobre "qué slots existen" es la
que ya construimos en `docs/Tareas/printer-ams-sensor-config/`: filas `Location` con
`location_type="printer_ams"` y `slot_index`, más `SpoolAssignment` para saber si un slot está
ocupado. "Leer desde AMS" aquí significa: mostrar esos slots reales (nunca inventar AMS para una
impresora sin locations sembradas — mismo mensaje "No AMS configured on this printer" ya usado en
`PrinterDetail.tsx`) y permitir seleccionar slots **vacíos** para crear+asignar un spool en un solo
paso, en vez de los dos pasos separados que hoy requiere `/spools` (crear spool, luego asignar).

Slots ya ocupados no son seleccionables aquí — ya se ven correctamente en `AmsSlotGrid`/
`PrinterDetail`; volver a "importarlos" crearía una asignación duplicada y confusa.

## Scope

Dentro: nuevo `AddFilamentModal.tsx` (Dialog con Tabs Manual Add/Read from AMS), nuevo
`ReadFromAmsPanel.tsx` (selector de impresora + grid de slots seleccionables + campos de material
compartidos + botón Add que crea spool+assignment por cada slot elegido), cambios en `Spools.tsx`
para reemplazar el formulario inline de creación por un botón "Add Filament" que abre el modal
(sin afectar la tabla de asignación existente). Sin cambios de backend — reutiliza
`spoolsApi`/`assignmentsApi` ya existentes.

Fuera: filtros/búsqueda/agrupación de Filament Manager (Fase 2+, otro ítem), campos de peso (no
existen en el schema actual de `FilamentSpool`, no se agregan aquí), selección de slots ya
ocupados.

## Files & Modules Involved

- `frontend/src/components/AddFilamentModal.tsx` (nuevo)
- `frontend/src/components/ReadFromAmsPanel.tsx` (nuevo)
- `frontend/src/pages/Spools.tsx` (reemplaza el form inline por el botón + modal)

## Implementation Steps

1. `ReadFromAmsPanel`: filtra impresoras con al menos una location `printer_ams`; selector de
   impresora; grid de slots (ordenados por `slot_index`) con checkbox solo en los vacíos,
   "Select all detected"/"Clear selection"; campos de material compartidos (mismo shape que
   `SpoolForm`); al enviar, crea un `FilamentSpool` + `SpoolAssignment` (secuencial) por cada slot
   seleccionado.
2. `AddFilamentModal`: `Dialog` + `Tabs` (`ui/tabs.tsx` ya existente) componiendo el `SpoolForm`
   existente (Manual Add) y el nuevo `ReadFromAmsPanel` (Read from AMS).
3. `Spools.tsx`: botón "Add Filament" que abre el modal; la tabla y la asignación por fila no
   cambian.
4. Validaciones: `npx tsc -b && npm run build && npm run lint`; Playwright manual (impresora con
   AMS muestra slots vacíos seleccionables, impresora sin AMS muestra "No AMS detected on this
   device", selección múltiple crea un spool+assignment por slot).

## Validation Steps

1. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
2. Playwright MCP: abrir "Add Filament" en `/spools`, tab "Read from AMS", elegir `P1S #1`
   (4 slots vacíos), seleccionar 2, llenar material, confirmar que se crean 2 spools nuevos
   asignados a esos slots (visibles luego en `/printers/5`'s AMS grid).
3. Elegir una impresora sin AMS (p.ej. `A1 mini #2`) y confirmar el mensaje "No AMS detected".

## Completion Criteria

- [x] `ReadFromAmsPanel` implementado (filtra impresoras con AMS, slots vacíos seleccionables,
      selección múltiple, mensaje explícito sin AMS)
- [x] `AddFilamentModal` implementado (tabs Manual Add/Read from AMS)
- [x] `Spools.tsx` actualizado (botón Add Filament, tabla/asignación existentes intactas)
- [x] `tsc -b`/`build`/`lint` limpios
- [x] Verificación Playwright completa (import de 2 slots simultáneos en P1S #1, reflejado
      correctamente en `/spools` y en `PrinterDetail`'s AMS grid)
