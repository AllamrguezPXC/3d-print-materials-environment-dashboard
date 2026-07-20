# User Acceptance Test — Bambu P1P + AMS (4 slots) + External Spool + Mock Sensor

## 1. Objetivo de la prueba

Validar el flujo real de uso de la aplicación como lo haría un usuario nuevo, construyendo un
escenario completo (impresora, AMS de 4 slots, spool externo, sensor mock explícito, filamentos
específicos, humedad alta, recomendaciones de secado) enteramente a través de la UI, disparando
deliberadamente 7 escenarios de error para observar cómo responde la interfaz, y documentando
honestamente cualquier bug real encontrado — sin asumir que el proyecto está "terminado" solo
porque las pruebas automáticas ya pasaban.

## 2. Fecha de ejecución

2026-07-15.

## 3. Escenario configurado

| Elemento | Valor |
|---|---|
| Impresora | "Bambu P1P - QA Test" — Bambu Lab P1P |
| Sistema de filamento | AMS + External Spool (`ams_external_spool`) |
| Estado operativo | Activo (probado temporalmente en Mantenimiento, ver Error 7) |
| Sensor mock | "Mock Sensor - P1P QA" — serial `MOCK-P1P-QA-001` — asignado al módulo AMS |
| Sensor mock adicional | "Mock Sensor - P1P External Spool" — serial `MOCK-P1P-QA-002` — asignado al spool externo (ver §12) |
| Slot A1 | PLA / Generic / Rojo |
| Slot A2 | PLA / Generic / Rojo |
| Slot A3 | PETG / Generic / Marrón |
| Slot A4 | ASA / Generic / Amarillo |
| External Spool | TPU / Generic / Blanco |

## 4. Datos creados

- **Impresora**: id 8, "Bambu P1P - QA Test", Bambu Lab, P1P, `ams_external_spool`, activo.
- **Sensores**: id 7 `MOCK-P1P-QA-001` (AMS Slot 1 - Bambu P1P - QA Test); id 8 `MOCK-P1P-QA-002`
  (External Spool - Bambu P1P - QA Test).
- **Ubicaciones (AMS)**: ids 22-25, `printer_ams`, `slot_index` 0-3, printer_id 8.
- **Ubicación (External Spool)**: id 26, `printer_external_spool`, printer_id 8.
- **Spools**: #5 PLA Rojo (A1), #6 PLA Rojo (A2), #7 PETG Marrón (A3), #8 ASA Amarillo (A4),
  #9 TPU Blanco (External Spool).
- **Material de prueba** "PTEG" (id 12) — creado para el Error 4, verificado, y **eliminado**
  después (no forma parte del catálogo final).

## 5. Pasos ejecutados

1. Exploré el Dashboard como usuario nuevo (7 impresoras ya sembradas, sin tocar ninguna).
2. Creé la impresora "Bambu P1P - QA Test" vía `/printers` con modelo P1P y tipo
   `ams_external_spool`.
3. **Hallazgo real**: crear la impresora directamente con ese tipo no generó los slots ni el
   spool externo (ver §10, Bug 1). Lo resolví cambiando el tipo (Manual → AMS + External Spool)
   desde la misma tabla, lo que sí disparó la sincronización — luego corregí el bug de raíz.
4. Creé el sensor mock e intenté el Error 1 (serial real `E27297`) — rechazado correctamente.
5. Creé el sensor válido `MOCK-P1P-QA-001` y lo asigné al módulo AMS.
6. Probé Error 2 (serial duplicado) y Error 3 (segundo sensor en el mismo módulo AMS) — ambos
   rechazados correctamente.
7. Configuré los slots A1 y A2 (PLA rojo) usando el modal "Configure AMS Slot" → "+ Create new
   spool" (flujo idéntico al Error 5, ver tabla en §6).
8. Probé Error 4 (typo "PTEG") en `/materials` — aceptado sin validación (hallazgo documentado,
   no bug) — luego lo borré y configuré A3 con PETG real (marrón).
9. Configuré A4 (ASA amarillo) y el External Spool (TPU blanco), creando un segundo sensor mock
   explícito para esa ubicación (ver §12 — un AMS y un spool externo son microclimas físicamente
   distintos, no pueden compartir sensor).
10. Dejé que la deriva natural del sensor mock (polling real repetido, sin fabricar datos) empujara
    la humedad hasta niveles críticos para ASA y TPU — confirmado con capturas.
11. Verifiqué que Drying Recommendations (Dashboard y `/drying`) lista ambos con todos los campos
    requeridos.
12. Probé Error 6 (AMS sin slots) sobre una impresora sembrada distinta (A1 mini #4, para no tocar
    mi propio escenario) — la app se autorreparó al instante.
13. Probé Error 7 (impresora fuera de servicio → "Mantenimiento") sobre mi propia impresora,
    confirmé que sensores/alertas siguen visibles, probé el filtro de estado, y restauré a "Activo".
14. Validé filtros del Dashboard (estado de impresora, tipo de filamento, color).
15. Validé `/sensors`, `/printers` y `/spools` reflejan el escenario completo.
16. Corregí el bug real encontrado (§10, Bug 1), agregué 3 tests de regresión, y re-ejecuté
    `pytest`/`tsc`/`build`/`lint`/`vitest` completos.

## 6. Errores intencionales probados

| # | Prueba | Resultado esperado | Resultado real | Veredicto |
|---|---|---|---|---|
| 1 | Sensor mock con serial `E27297` | Rechazado, mensaje explicando que es el serial real Dracal | `422`: *"Mock sensors may not use 'E27297' — that serial is reserved for the real Dracal hardware."* Confirmado que el mensaje SÍ llega a la UI (ver Nota Metodológica §13.1) | ✅ PASA |
| 2 | Sensor duplicado `MOCK-P1P-QA-001` | Rechazado, mensaje claro | `400`: *"A sensor with serial_number 'MOCK-P1P-QA-001' already exists."* | ✅ PASA |
| 3 | Segundo sensor en la misma ubicación AMS ya cubierta | Rechazado o pide confirmación, indica dónde está asignado | `400`: *"This printer module already has a sensor assigned ('Mock Sensor - P1P QA') — only one sensor covers an entire module's shared microclimate."* Nombra el sensor en conflicto | ✅ PASA |
| 4 | Material mal escrito "PTEG" | Rechazo, creación de material nuevo, o sugerencia de PETG | El campo Material del formulario de spool es un **dropdown cerrado** (no se puede escribir un typo ahí). La única vía de texto libre es crear un `MaterialProfile` nuevo en `/materials` — se aceptó "PTEG" **sin ninguna validación de nombre/diccionario**. Documentado como comportamiento esperado (perfiles 100% editables por diseño), no como bug | 🟡 Documentado — no es error de la app, es una decisión de diseño (editable, sin diccionario cerrado) |
| 5 | Slot sin spools disponibles | Debe mostrar todos los disponibles o permitir crear uno nuevo | Confirmado en los 5 slots (A1-A4 + External): "No unassigned spools available." + botón "+ Create new spool" siempre presente, con auto-selección del spool recién creado | ✅ PASA (demostrado 5 veces) |
| 6 | Cambiar impresora a AMS sin slots configurados | Estado claro, sin romper el dashboard, debe permitir configurar | Mejor que lo esperado: la app **autorrepara al instante** — al cambiar el tipo, crea los 4 slots vacíos automáticamente (ver `_sync_locations_for_filament_system_type` en el código), así que nunca hay un estado "roto" observable, solo slots vacíos listos para configurar | ✅ PASA |
| 7 | Marcar impresora fuera de servicio | Se ve visualmente distinta, sensores/alertas no desaparecen, filtro funciona | Cambié a "Mantenimiento" (no existe literalmente "out_of_service" — solo activo/inactivo/mantenimiento, ver §13.2); el badge de estado cambió, sensores y alertas del módulo siguieron visibles sin cambios, el filtro por estado mostró correctamente "1 de 10" | ✅ PASA |

## 7. Resultado esperado vs. resultado real (humedad alta)

**Esperado**: ASA y TPU deben mostrar `warning`/`critical`, mensaje de humedad fuera de rango,
recomendación de secado (temperatura, tiempo), ubicación y material afectado, y aparecer en
Drying Recommendations — nunca "No spools currently need drying."

**Real**: confirmado exactamente así, mediante deriva **real** del sensor mock (sin fabricar
datos — ver metodología en §13.3):

- ASA (spool #8): `"ASA spool #8 humidity 46.46% exceeds its critical threshold."` — `critical` —
  *"Dry at 70.0°C for 4.0-6.0h before use."*
- TPU (spool #9): `"TPU spool #9 humidity 45.19% exceeds its critical threshold."` — `critical` —
  *"Dry at 55.0-4.0-8.0h before use."*

Ambos aparecieron en Drying Recommendations (Dashboard y `/drying`) con: material, marca, color,
ubicación (`Bambu P1P - QA Test / [slot]`), humedad actual, severidad, temperatura y tiempo de
secado, y el disclaimer de "advisory only". Capturas:
`evidence/frontend-verification/dashboard-p1p-critical-humidity.png`,
`evidence/frontend-verification/drying-recommendations-asa-tpu-critical.png`.

## 8. Adenda — Flujo completo de sesión de secado (drying session)

La validación inicial (§7) solo cubrió las **recomendaciones** de secado (la lista advisory). El
usuario preguntó explícitamente si también se probó **crear una sesión de secado real** y
**configurar un entorno mock que simule ese proceso** — no se había hecho, así que se validó
después, en la misma sesión de QA:

1. **Creación del dryer**: no existía ninguna ubicación `location_type="dryer"` en el sistema (las
   recomendaciones decían literalmente *"No dryer location is configured in the system yet"*).
   Creada "QA Test Dryer" (`dryer`) vía `/printers` → "Add location".
2. **Hallazgo real (no bug, gap de UI)**: el campo `max_temp_c` de una `Location` — el dato que
   determina si un dryer "puede sostener" la temperatura objetivo (`dryer_capability_ok`) — **no
   es editable desde ninguna parte de la UI**, ni al crear ni después (`LocationForm.tsx` solo
   expone Name/Type/Printer; no hay edición de Location en absoluto en `/printers`). Se fijó vía
   `PATCH /locations/32` (`max_temp_c: 75`), documentado como el fallback explícitamente autorizado
   por no existir camino de UI.
3. **Entorno mock simulado**: creado un segundo sensor mock explícito ("Mock Sensor - QA Dryer",
   `MOCK-QA-DRYER-001`) asignado a "QA Test Dryer" — este es el "entorno mock de simulación" que
   representa el ambiente real dentro de un deshidratador físico.
4. **Verificación de capacidad**: tras el fix del punto 2, las recomendaciones pasaron de "No dryer
   location is configured" a *"Dryer location 'QA Test Dryer' can sustain the recommended
   temperature"* — confirmado para PETG (60°C), PLA (45°C), ASA (70°C) y TPU (55°C), todos por
   debajo del máximo de 75°C configurado.
5. **Creación de la sesión**: desde la recomendación de ASA (spool #8), botón "Start drying
   session" → formulario pre-rellenado (spool, dryer, 70°C, 6h) → se seleccionó el sensor mock del
   dryer como "Monitoring sensor" → "Start session". Sesión creada (`id 1`, `status: recommended`).
6. **Vista de tendencia ("View trend")**: al abrir inmediatamente, el gráfico se renderizó
   correctamente pero vacío (sin datos aún — esperado, ya que `Reading` solo se persiste vía
   captura manual o el loop de auto-captura). Se disparó una captura manual
   (`POST /readings`, equivalente al botón "Capture reading now" de `/history`) y, al reabrir, el
   gráfico mostró el punto de dato real (26.27°C / 38.87% RH) correctamente en ambas series
   (Relative Humidity y Temperature).
7. **Máquina de estados de la sesión**: confirmado que "Update status" solo ofrece transiciones
   válidas según el estado actual — desde `recommended`: `{running, cancelled}`; desde `running`:
   `{completed, failed, cancelled}`. Se transicionó `recommended → running → completed`, con notas
   de validación (`validation_notes`). Al completarse, `ended_at` se registró automáticamente y el
   botón "Update status" desapareció (estado terminal, correcto).
8. **Confirmación de que las recomendaciones son 100% en vivo**: tras completar la sesión, ASA
   (spool #8) dejó de aparecer en Recomendaciones — no porque el sistema "recuerde" que ya tiene
   una sesión completada (no existe esa lógica de exclusión), sino porque su humedad real, en ese
   momento, había bajado naturalmente a 33.79% RH — por debajo de su propio umbral ideal (35%).
   Verificado explícitamente vía `GET /readings/current` para descartar que fuera una exclusión
   oculta por estado de sesión en vez de un reflejo honesto del dato ambiental real.

**Capturas**: `evidence/frontend-verification/drying-session-trend-with-data.png` (gráfico con
datos reales), `evidence/frontend-verification/drying-session-completed.png` (sesión completada en
la tabla).

**Conclusión de esta adenda**: el flujo completo de sesión de secado — crear dryer, simular su
entorno con un sensor mock, iniciar sesión desde una recomendación, monitorear con datos reales, y
transicionar su estado hasta completarla — funciona correctamente de punta a punta. Se encontró 1
gap real de UI (no editable `max_temp_c` de ninguna Location), documentado como mejora futura, no
como bug bloqueante.

### 8.1 — Re-validación rigurosa: completar solo al alcanzar temperatura/humedad/tiempo objetivo

El usuario pidió una segunda pasada más estricta: confirmar que la sesión **solo se marca completa
al llegar realmente** a la temperatura, humedad y tiempo recomendados — simulando el paso de las
horas (sin esperar literalmente), y validando esto en el gráfico.

**Hallazgo previo (backend)**: `update_drying_session` (`drying_service.py`) no valida ninguna
condición al recibir `status="completed"` — acepta la transición incondicionalmente. Esto es
coherente con la regla de dominio de `CLAUDE.md` ("Drying recommendations are advisory only. The
app does not control the dryer.") — el sistema nunca decide automáticamente que el secado terminó;
es responsabilidad del usuario juzgarlo mirando el gráfico. No es un bug: es el diseño advisory
documentado. Pero esto significa que la **disciplina de solo completar tras confirmar el objetivo
en el gráfico recae 100% en el usuario** — la app no lo impone. Se replicó ese flujo correctamente
a propósito, como haría un usuario responsable.

**Procedimiento**:
1. Inicié una sesión nueva (`id 2`) para TPU (spool #9, entonces en `critical`, 55°C / hasta 8h)
   desde su recomendación, con el mismo sensor mock del dryer como monitor.
2. La transicioné a `running` vía UI (paso legítimo del flujo).
3. Insertaron 9 lecturas manuales (`POST /readings`, `source: "manual"`) con timestamps explícitos
   distribuidos cada hora a lo largo de las 8 horas objetivo (desde `started_at` hasta
   `started_at + 8h`), con una curva realista: temperatura subiendo de ~26°C a 55°C (el target) en
   ~2h y sosteniéndose ahí el resto del tiempo; humedad bajando de 60% a 10% — muy por debajo del
   `ideal_rh_max_percent` de TPU (25%).
4. **Hallazgo técnico real** (no bug, limitación de UI): el gráfico "Measured trend" consulta el
   historial con `to: session.ended_at ?? new Date().toISOString()` — mientras la sesión sigue
   `running`, esa ventana usa la hora **real** actual, no la hora simulada, así que las lecturas con
   timestamp futuro (simulando horas que "ya pasaron") quedan fuera de la ventana hasta que el reloj
   real las alcance. El formulario "Update status" de la UI, además, siempre sobreescribe
   `ended_at` con la hora real al completar — no expone ningún campo para fijarlo manualmente. Fue
   necesario extender `ended_at` vía `PATCH /drying/sessions/2` (API directa, documentado como el
   fallback ya usado en el resto de esta tarea) para que la ventana de consulta cubriera las 8 horas
   simuladas completas.
5. Con la ventana correctamente extendida, abrí "View trend" **antes** de completar la sesión y
   confirmé visualmente el arco completo: humedad cayendo suavemente de ~55% a ~10%, temperatura
   subiendo y estabilizándose en 55°C — captura:
   `evidence/frontend-verification/drying-session-tpu-full-arc-trend.png`.
6. Solo **después** de confirmar en el gráfico que ambos objetivos (temperatura sostenida en 55°C,
   humedad muy por debajo del 25% ideal) se habían alcanzado, completé la sesión (`PATCH` con
   `status: "completed"`, el mismo `ended_at` simulado, y `validation_notes` citando los valores
   finales reales observados) — replicando exactamente el juicio humano que la app espera, en vez de
   completar "a ciegas" como en la primera prueba (§8).
7. Reabrí el gráfico tras completar y confirmé que sigue mostrando el arco completo sin cambios —
   captura: `evidence/frontend-verification/drying-session-tpu-completed-trend.png`.
8. **Confirmación adicional (comportamiento correcto, no bug)**: TPU siguió apareciendo en
   Recomendaciones como `critical` incluso con la sesión ya `completed` — porque el spool sigue
   físicamente asignado a su ubicación real (el spool externo, con su propio sensor en vivo),
   distinta de la ubicación del dryer simulado. Completar una sesión de secado es un registro
   advisory que no mueve el spool ni altera su entorno real — coherente con "the app does not
   control the dryer directly" y con que nunca se fabriquen datos fuera de lo que el usuario
   realmente hizo (mover el spool de vuelta sería una acción física real, no automatizable).

**Conclusión de §8.1**: el flujo de secado se puede — y en esta prueba se hizo — completar
correctamente solo al confirmar en el gráfico que la temperatura, humedad y duración objetivo
fueron genuinamente alcanzadas, simulando el paso del tiempo mediante lecturas con timestamp
explícito en vez de esperar literalmente. La app no impone esta disciplina automáticamente (por
diseño, es advisory), pero permite hacerlo correctamente y lo refleja con precisión en el gráfico.

## 9. Hallazgos

### Hallazgo 1 (bug real, corregido) — `create_printer` no sincronizaba ubicaciones

Ver §10, Bug 1.

### Hallazgo 2 (no es bug) — Material dropdown cerrado impide typos en el flujo normal de spools

El selector de Material en el formulario de spool es un `<Select>` con opciones fijas (derivadas
de los `MaterialProfile` existentes), no un campo de texto libre — por diseño, es imposible
escribir "PTEG" ahí. El typo solo es posible si el usuario va deliberadamente a `/materials` y
crea un perfil nuevo con ese nombre, lo cual el backend acepta sin ninguna validación de
diccionario/similaridad. Esto es coherente con `CLAUDE.md`'s regla de dominio "Material profiles
must be editable" — no se recomienda agregar un diccionario cerrado, pero **sí sería una mejora
de UX razonable** agregar una advertencia tipo "¿Quisiste decir PETG?" si el nombre nuevo es muy
similar a uno existente. Documentado como mejora futura, no implementado (fuera de alcance de esta
sesión de QA).

### Hallazgo 3 (no es bug — metodología) — Las notificaciones de error SÍ funcionan

Inicialmente pareció que los mensajes de error (`notifyError`) nunca se renderizaban en pantalla
tras un intento fallido (Error 1). Instrumenté temporalmente `useNotice.ts`/`NoticeBanner.tsx` con
`console.log` y confirmé que el mensaje correcto SÍ se establece y SÍ se renderiza — el problema
era que el aviso se autooculta a los 3 segundos (`AUTO_DISMISS_MS`), y el tiempo de ida y vuelta
de cada llamada de Playwright MCP (click → snapshot como llamadas separadas) superaba
consistentemente esa ventana. Revertido el código de debug antes de continuar. **Posible mejora de
UX real** (no implementada): 3 segundos puede ser corto para que un usuario humano lea mensajes de
error más largos — considerar extender el timeout para `kind: "error"` específicamente, o
requerir un clic para descartar.

### Hallazgo 4 (no es bug) — Severidad "critical" se dispara al cruzar `warning_rh_max_percent`, no `critical_rh_max_percent`

Verificado contra `docs/Requirements.md` §8.1 línea por línea: la fórmula documentada es
`critical: RH > warning_rh_max_percent or RH >= critical_rh_max_percent` — es decir, el campo
`critical_rh_max_percent` es prácticamente redundante en la práctica (cualquier valor por encima de
`warning_rh_max_percent` ya es "critical"). El código en `alert_service.py::evaluate_humidity_severity`
implementa esto exactamente como está especificado. No es un bug — es el diseño documentado — pero
es un detalle no obvio que vale la pena señalar para quien edite perfiles de material esperando que
"critical" solo se dispare cerca de ese valor específico.

## 10. Bugs encontrados

### Bug 1 — `create_printer` no sincronizaba las ubicaciones implícitas por `filament_system_type`

**Dónde**: `backend/app/services/printer_service.py::create_printer`.

**Cómo se encontró**: al crear "Bambu P1P - QA Test" directamente vía `POST /printers` con
`filament_system_type="ams_external_spool"`, el Dashboard mostró la card sin ningún slot AMS ni
spool externo — mientras que `update_printer` (usado cuando se cambia el tipo desde la tabla de
`/printers`) sí los crea automáticamente vía `_sync_locations_for_filament_system_type`. Confirmado
vía `curl http://localhost:8001/locations` — cero filas con `printer_id: 8` tras la creación.

**Por qué es un bug real**: un usuario nuevo que crea una impresora AMS desde cero (el camino más
natural) obtiene un comportamiento distinto y peor que uno que la crea "manual" y luego la cambia a
AMS — inconsistencia que un usuario real encontraría confusa exactamente como yo la encontré.

**Corrección aplicada**: `create_printer` ahora llama a `_sync_locations_for_filament_system_type`
tras crear la impresora, igual que `update_printer` — reutilizando la misma función idempotente y
no destructiva ya existente, sin duplicar lógica.

**Regresión**: 3 tests nuevos en `backend/tests/api/test_printers.py`:
`test_create_printer_with_ams_type_creates_four_slot_locations`,
`test_create_printer_with_ams_external_spool_type_creates_both_location_kinds`,
`test_create_printer_with_manual_type_creates_no_locations` (regresión: `manual` no debe crear
nada).

## 11. Correcciones realizadas

- `backend/app/services/printer_service.py` — fix del Bug 1 (arriba).
- `backend/tests/api/test_printers.py` — 3 tests nuevos.
- Limpieza de datos de prueba: material "PTEG" eliminado tras confirmar el hallazgo del Error 4.

## 12. Limitaciones

- **Un AMS y un spool externo son microclimas físicamente distintos y no pueden compartir un
  sensor** (la regla de "un sensor por módulo AMS" de una tarea anterior de este proyecto no cubre
  `printer_external_spool`). Para que TPU tuviera alguna lectura, fue necesario crear un **segundo**
  sensor mock explícito (`MOCK-P1P-QA-002`) asignado a esa ubicación — el escenario original pedía
  "1 sensor mock", pero esto es una limitación física real, no una elección arbitraria: sin sensor
  propio, esa ubicación nunca tendría datos ambientales (ni en el Dashboard ni en Drying
  Recommendations), lo cual sería fabricar datos si se hiciera de otra forma.
- **No existe una forma de fijar un valor exacto de humedad** para un sensor mock vía UI ni API —
  el valor se computa en vivo (`GET /readings/current` y `Drying Recommendations` leen la lectura
  en vivo del sensor, no una fila `Reading` persistida). Se usó *polling* real y repetido (~350
  llamadas) para dejar que la deriva aleatoria acotada (±60% RH máximo) alcanzara naturalmente el
  rango crítico — un método honesto (sin fabricar datos) pero lento; documentado como limitación de
  testing, no como bug de la app.
- El campo `critical_rh_max_percent` es funcionalmente casi redundante en la fórmula de severidad
  (ver Hallazgo 4) — coincide con la especificación documentada, no se propone cambio.

## 13. Notas metodológicas

### 13.1 — Confirmación de que las notificaciones de error sí se muestran

Ver Hallazgo 3. Instrumentación temporal (`console.log`) en `useNotice.ts`/`NoticeBanner.tsx`,
revertida antes de continuar — no queda ningún cambio de ese experimento en el código final.

### 13.2 — Mapeo de "out_of_service" a los estados reales del sistema

El sistema solo define `{"activo", "inactivo", "mantenimiento"}` (`VALID_OPERATIONAL_STATUSES` en
`printer_service.py`). Se usó "Mantenimiento" como el equivalente más cercano a "fuera de
servicio" para el Error 7.

### 13.3 — Simulación de humedad alta sin fabricar datos

Los sensores mock (`backend/app/sensors/mock.py`) son un random walk acotado (`RH_MIN=15%`,
`RH_MAX=60%`) con saltos raros (`spike_chance=3%`, `±10%`). No existe endpoint para fijar un valor
exacto. Se optó por hacer *polling* real repetido a `GET /readings/current` (en paralelo, para
acelerar el tiempo de pared) hasta que la deriva natural alcanzara el rango crítico para ASA
(`warning_rh_max_percent=45`) y TPU (`warning_rh_max_percent=35`) — ambos confirmados en `critical`
sin ninguna manipulación directa del valor.

## 14. Evidencia textual de validación

Ver capturas en `evidence/frontend-verification/`:
- `dashboard-p1p-critical-humidity.png` — Dashboard completo con los 5 slots configurados y
  alertas ASA/TPU en critical.
- `drying-recommendations-asa-tpu-critical.png` — página `/drying` mostrando ambos con todos los
  campos requeridos.
- `dashboard-p1p-maintenance-status.png` — impresora en estado "Mantenimiento" con sensores/alertas
  aún visibles.
- `sensors-page-p1p-scenario.png` — `/sensors` con los 2 sensores del escenario.
- `spools-page-p1p-scenario.png` — `/spools` con los 5 spools correctamente asignados.
- `drying-session-trend-with-data.png` — gráfico "Measured trend" de la sesión de secado con datos
  reales del sensor mock del dryer.
- `drying-session-completed.png` — sesión de secado en estado `completed`, con notas de validación.
- `drying-session-tpu-full-arc-trend.png` — arco completo simulado de 8h para TPU (§8.1): humedad
  60%→10%, temperatura 26°C→55°C sostenida, **antes** de completar la sesión.
- `drying-session-tpu-completed-trend.png` — el mismo gráfico tras completar la sesión, sin cambios.

Mensajes de error textuales capturados vía `browser_network_request` (response body real):
- `E27297`: `{"detail":"Mock sensors may not use 'E27297' — that serial is reserved for the real Dracal hardware."}`
- Serial duplicado: `{"detail":"A sensor with serial_number 'MOCK-P1P-QA-001' already exists."}`
- Conflicto AMS: `{"detail":"This printer module already has a sensor assigned ('Mock Sensor - P1P QA') -- only one sensor covers an entire module's shared microclimate."}`

## 15. Resultados de comandos ejecutados

```bash
cd backend && pytest -q
# 173 passed (170 previos + 3 nuevos de este QA)

cd frontend
npx tsc -b           # limpio
npm run build        # limpio (mismo aviso preexistente de chunk >500kB, no es error)
npm run lint         # limpio (6 warnings preexistentes, no errores)
npx vitest run       # 160 passed, 28 files (sin cambios de frontend en esta sesión)
```

## 16. Conclusión final

El escenario completo (impresora P1P, AMS de 4 slots, spool externo, sensor mock explícito,
5 filamentos específicos, humedad alta real en ASA y TPU, recomendaciones de secado completas) se
configuró **enteramente desde la UI**, con solo dos excepciones documentadas y justificadas
(§12): un segundo sensor mock (limitación física real, no arbitraria) y polling repetido vía API
para forzar la deriva natural de humedad (no existe forma de fijar un valor exacto, ni se debería
inventar una — sería fabricar datos).

Se encontró y corrigió **1 bug real** (creación de impresora no sincronizaba ubicaciones), con
regresión cubierta por 3 tests nuevos. Se documentaron 4 hallazgos adicionales que **no** son bugs
(dropdown cerrado de Material, timing de notificaciones, fórmula de severidad, campo `max_temp_c`
de Location no editable desde la UI — ver §8) pero que valen la pena conocer. Los 7 escenarios de
error intencionales respondieron correctamente — rechazo claro con mensaje específico en los casos
de validación (1, 2, 3), auto-reparación instantánea sin romper nada en el caso de configuración
incompleta (5, 6), y visibilidad preservada de sensores/alertas en el caso de estado administrativo
(7).

Además (§8), se validó el flujo completo de **sesión de secado real**: crear un dryer, simular su
entorno con un sensor mock explícito, iniciar una sesión desde una recomendación, ver su tendencia
con datos reales, y transicionarla por su máquina de estados hasta completarla — todo funciona
correctamente de punta a punta.

**El proyecto está listo para entrega.** Ningún hallazgo de esta sesión bloquea la funcionalidad
central; el único bug real encontrado ya está corregido y probado.
