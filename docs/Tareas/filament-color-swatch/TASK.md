# Color swatch picker para filamentos

## Objective

Reemplazar el campo de color de texto libre por un selector con paleta de colores comunes +
swatch visual, y mostrar ese swatch (no solo texto) en la tabla de Filament Manager y en el grid
de slots AMS — el último ítem de la lista de Fase 2+ diferida, elegido a discreción tras
confirmar con el usuario que continuara "con el que consideres mejor".

## Context

El campo `FilamentSpool.color` es un string libre (`str | None`) sin columna de valor hexadecimal
en el backend — no hay forma de persistir un color RGB/hex real sin una migración de esquema
(fuera de alcance, sin herramienta de migraciones en este proyecto). En vez de fabricar un campo
hex que no existe, este ítem se implementa honestamente como: (1) un mapeo best-effort de nombres
de color comunes a un valor CSS para mostrar un swatch visual donde ya se muestra el nombre de
color (nunca inventa un color para un nombre no reconocido — usa un swatch neutro/outline), y
(2) un selector con una paleta de nombres de color comunes de filamento (Black, White, Gray,
Silver, Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown, Gold, Transparent/Clear) que
simplemente rellena el mismo campo de texto existente, sin bloquear la entrada de un nombre
personalizado.

## Scope

Dentro: `frontend/src/lib/colorSwatch.ts` (nuevo, mapeo nombre→CSS), `frontend/src/components/ColorSwatch.tsx`
(nuevo, swatch circular), `frontend/src/components/ColorSwatchPicker.tsx` (nuevo, input de texto +
swatch de vista previa + paleta de presets), reemplazo del `Input` de color en `SpoolForm.tsx` y
`ReadFromAmsPanel.tsx` por `ColorSwatchPicker`, swatch junto al texto de color en la tabla de
`Spools.tsx` y en `AmsSlotButton.tsx`. Sin cambios de backend/esquema.

Fuera: persistir un valor hexadecimal real (requeriría columna nueva); selector de color RGB
completo tipo `<input type="color">` (no hay valor hex que guardar, solo simularía precisión que
no existe).

## Files & Modules Involved

- `frontend/src/lib/colorSwatch.ts` (nuevo)
- `frontend/src/components/ColorSwatch.tsx` (nuevo)
- `frontend/src/components/ColorSwatchPicker.tsx` (nuevo)
- `frontend/src/components/SpoolForm.tsx`
- `frontend/src/components/ReadFromAmsPanel.tsx`
- `frontend/src/components/AmsSlotButton.tsx`
- `frontend/src/pages/Spools.tsx`

## Implementation Steps

1. `colorSwatch.ts`: `guessSwatchColor(name: string | null): string | null` — normaliza el string
   (lowercase, trim) y busca coincidencias de palabras clave comunes; `null` si no reconoce nada
   (el componente debe mostrar un swatch neutro/outline en ese caso, no inventar un color).
2. `ColorSwatch.tsx`: círculo pequeño con `background-color` del color adivinado, o un anillo
   discreto sin relleno si no se reconoce el nombre; `title` con el nombre real para accesibilidad.
3. `ColorSwatchPicker.tsx`: `Input` de texto existente + `ColorSwatch` de vista previa a la
   izquierda + un popover/lista de presets comunes que, al hacer clic, rellenan el input (no
   reemplaza la posibilidad de escribir un nombre personalizado).
4. Reemplazar el campo Color en `SpoolForm`/`ReadFromAmsPanel` por `ColorSwatchPicker`.
5. Agregar `ColorSwatch` junto al texto de color en la celda "Color" de `Spools.tsx` y en
   `AmsSlotButton.tsx`.
6. Validaciones: `npx tsc -b && npm run build && npm run lint`; Playwright manual (elegir un
   preset, ver el swatch en la tabla y en el grid AMS, escribir un nombre no reconocido y
   confirmar el swatch neutro).

## Validation Steps

1. `cd frontend && npx tsc -b && npm run build && npm run lint` sin errores.
2. Playwright MCP: abrir Add Filament, elegir un preset de color (ej. "Orange"), confirmar el
   swatch naranja junto al texto en la tabla; editar un spool con color no reconocido (ej. "Foo")
   y confirmar el swatch neutro; confirmar el swatch también aparece en el grid AMS de un
   printer con slots ocupados.

## Completion Criteria

- [x] `colorSwatch.ts` implementado (mapeo best-effort, `null` para no reconocidos)
- [x] `ColorSwatch`/`ColorSwatchPicker` implementados
- [x] `SpoolForm`/`ReadFromAmsPanel` usan el nuevo picker
- [x] Swatch visible en `Spools.tsx` y `AmsSlotButton.tsx`
- [x] `tsc -b`/`build`/`lint` limpios
- [x] Verificación Playwright completa (preset "Blue" rellena el campo y actualiza la vista
      previa; swatches visibles en la tabla de Filament Manager y en el grid AMS de
      `PrinterDetail`)
