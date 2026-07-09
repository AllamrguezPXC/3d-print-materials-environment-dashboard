# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PAUL Dashboard Data Analisis — local-first web app that extracts pipette calibration data from PDF certificates and service Excel files, runs the PAUL comparative analysis, and produces Excel reports and Power BI exports. The application compares PAUL robotic calibration results against manual technician data.

Source of truth: `docs/Requirements.md`. Task checklist: `docs/Tasks.md`.

---

## Commands

> Backend and frontend are not yet initialized (Section 1 of Tasks.md is next).
> These commands will work once the scaffolding is in place.

**Backend** (from `backend/`):
```
uvicorn app.main:app --reload --port 8000   # dev server
pytest                                       # all tests
pytest tests/test_health.py -v              # single test file
ruff check .                                # lint
black --check .                             # format check
black .                                     # format
```

**Frontend** (from `frontend/`):
```
npm run dev       # dev server (localhost:5173)
npm run build     # production build
npx vitest run    # tests
npm run lint      # lint
```

---

## Architecture

### Data Flow

```
Services Data/Servicios/
  └─ <Client>/<ServiceNumber>/certificate_*.pdf   ← never modified
  └─ <Client>/Servicio <number>.xlsx              ← never modified
        ↓
  folder_scanner.py       discovers clients, services, files
  markitdown (MCP)        pre-read recon step → structure preview before extraction
  pdf_extractor.py        PyMuPDF primary → pdfplumber fallback → needs_review
  excel_extractor.py      flexible column mapping, read-only
        ↓
  analysis_engine.py      calibration formulas + PASS/FAIL logic
        ↓
  DuckDB (backend/data/)  local analytics database, no server required
        ↓
  FastAPI routers         localhost:8000
        ↓
  React/Vite frontend     localhost:5173  (TanStack Query + TanStack Table)
        ↓
  report_generator.py     exports/excel/
  powerbi_service.py      exports/powerbi/
```

### Backend Layer (`backend/app/`)

- `main.py` — FastAPI app, router registration, CORS
- `config.py` — loads `.env` via python-dotenv, exposes typed settings
- `database/db.py` — DuckDB connection and schema initialization
- `database/models.py` — table definitions
- `services/` — all business logic (extraction, analysis, reporting); routers must not contain business logic
- `routers/` — thin API layer; delegates to services
- `schemas/` — Pydantic models for API I/O and internal data transfer

### Frontend Layer (`frontend/src/`)

- `api/client.ts` — Axios/fetch wrapper with base URL from `VITE_API_BASE_URL`
- `pages/` — one file per screen (Dashboard, IngestData, CalibrationTable, PipetteDetail, Reports, Settings)
- `components/` — shared UI (badges, cards, layout)
- `tables/` — TanStack Table definitions and column configs
- `charts/` — Recharts chart components

### Database Choice

DuckDB is used over SQLite because calibration queries are analytical (GROUP BY client/manufacturer/volume, aggregated counts, stacked bar data). DuckDB is columnar and integrates directly with Pandas. Database file lives at `backend/data/paul_dashboard.duckdb` — never inside `Services Data/`.

---

## Critical Safety Rules

These rules apply to ALL code, hooks, scripts, and agents:

1. **Never modify anything inside `Services Data/`** — source PDFs, Excel files, and templates are read-only forever.
2. All generated files go to `exports/` only. Temp files go to `tmp/` or `scratch/`.
3. If any extracted field is uncertain → set to `null` and set `needs_review = true`. Never guess or fill with defaults.
4. The Excel report (`exports/excel/`) is an output artifact. The DuckDB database is the internal source of truth.
5. Power BI REST API must remain disabled unless all five credentials are explicitly configured.

Protected paths (hardcoded in every hook and agent):
```
Services Data/
Services Data/Servicios/
Services Data/Plantilla Vacia de Analisis General Pipetas Paul 2 vs Manual (New Charcterize & Baseline).xlsx
Services Data/Ejemplo de Analisis General Pipetas Paul 2 vs Manual (New Charcterize & Baseline).xlsx
```

---

## Calibration Business Logic

Full formula reference: `docs/validation_rules.md`. Summary for quick reference:

```python
target_volume_ul = nominal_volume_ul * volume_percent        # 1.0=100%, 0.5=50%, 0.1=10%
mean_volume_ul   = statistics.mean(runs)
systematic_error_percent = ((mean - target) / target) * 100
random_error_percent     = (statistics.stdev(runs) / mean) * 100   # sample stdev = STDEV.S
```

**Systematic error limits** (nominal µL → limit at 100%/50%/10%):

| Nominal range   | 100% | 50%  | 10%  |
|-----------------|------|------|------|
| 10–50 µL        | 1.0% | 2.0% | 10.0% |
| >50–5000 µL     | 0.8% | 1.6% |  8.0% |
| >5000–20000 µL  | 0.6% | 1.2% |  6.0% |

**PASS/FAIL decisions:**
```python
paul_vs_limit_result  = "FAIL" if abs(systematic_error_percent) >= limit / 2 else "PASS"
paul_vs_manual_result = "FAIL" if abs(paul_mean - manual_mean) / manual_mean * 100 >= limit / 2 else "PASS"
conclusion = "PASS" if both above are PASS else "FAIL"
# If manual_mean is missing → paul_vs_manual_result = "n/a", conclusion = paul_vs_limit_result
```

**Important:** `conclusion` measures PAUL comparative performance (vs 50% of systematic limit and vs manual data). It is **not** the official ISO/JCGM calibration pass/fail decision.

**Multi-channel rule:** global result is `FAIL` if any single channel or point fails.

**As Found / As Left:** if a volume point appears once → `As Found`. If repeated (corrected) → first set is `As Found`, repeated set is `As Left`. Uncertain → `needs_review`.

---

## `needs_review` Pattern

`needs_review = true` propagates up: a flagged run → flagged point → flagged pipette → flagged global result. Never silently discard uncertain data. The "Needs Review" Excel sheet and frontend badge exist specifically to surface these rows for human inspection.

---

## Environment

Backend `.env` (copy from `backend/.env.example`):
```
APP_NAME="PAUL Dashboard Data Analisis"
APP_VERSION="0.1.0"
PROJECT_ROOT="C:/Users/AllamRodriguez/Desktop/Programas/PAUL Dashboard Data Analisis"
SERVICES_DATA_PATH="...Services Data"
SERVICES_FOLDER_PATH="...Services Data/Servicios"
EXPORTS_PATH=".../exports"
DATABASE_URL="duckdb:///./data/paul_dashboard.duckdb"
POWERBI_ENABLED=false
```

Frontend `.env` (copy from `frontend/.env.example`):
```
VITE_API_BASE_URL="http://localhost:8000"
VITE_APP_NAME="PAUL Dashboard Data Analisis"
```

---

## Validation Reference

Analysis engine calculations must be validated against:
```
Services Data/Ejemplo de Analisis General Pipetas Paul 2 vs Manual (New Charcterize & Baseline).xlsx
```
Sheets: `General Paul2vsTecnico` (single channel) and `General Paul2vsTecnico (Multi)` (multi-channel).
Validation report output: `exports/logs/validation_against_example.xlsx`.
Numeric tolerance for comparison: configure in `tests/test_against_example_excel.py`.

---

## Key Docs

| File | Purpose |
|------|---------|
| `docs/Requirements.md` | Full project requirements — primary source of truth |
| `docs/Tasks.md` | Implementation checklist by section |
| `docs/validation_rules.md` | All calibration formulas with Python equivalents |
| `docs/excel_mapping.md` | Column alias table and `map_columns()` pseudocode |
| `docs/pdf_extraction_rules.md` | PDF parsing strategy, field regexes, confidence scoring |
| `docs/data_dictionary.md` | All 8 database table schemas with column descriptions |
| `docs/powerbi_strategy.md` | Star schema, DAX measures, REST API opt-in rules |
| `docs/architecture.md` | Tech stack decisions, DuckDB rationale, API layer diagram |


## MarkItDown MCP — Uso en este Proyecto

El servidor MCP `markitdown` (Microsoft) está configurado globalmente en Claude Code
(`~/.claude.json`, scope `user`) y disponible como herramienta en todas las sesiones.

### Cuándo usarlo

**1. Pre-lectura de certificados PDF antes de la extracción**
Antes de ejecutar `pdf_extractor.py` sobre un certificado nuevo o problemático, usar
markitdown para hacer un reconocimiento rápido de su estructura:

```
# Uso típico en sesión de Claude Code:
"Usa markitdown para leer el contenido de Services Data/Servicios/<cliente>/<num>/certificate_XXXX.pdf"
```

Esto permite verificar:
- Qué campos están presentes (Cert No., Asset No., Serial, Range, canales)
- Si la tabla de mediciones tiene el formato esperado (R1–R10, Systematic/Random Error)
- Si hay anomalías de layout antes de que el extractor las encuentre
- Por qué un certificado específico quedó marcado `needs_review`

**2. Diagnóstico de certificados que fallan extracción**
Si `pdf_extractor.py` retorna `needs_review = True` y no queda claro por qué, usar
markitdown para ver el texto crudo que el PDF expone, sin lógica de regex. Comparar
visualmente con lo que el extractor debería capturar.

**3. Pre-lectura de archivos Excel de servicio**
Para inspeccionar rápidamente la estructura de un `Servicio XXXXX.xlsx` sin abrir Excel:
qué hojas tiene, qué columnas, qué filas tienen datos válidos, si las cabeceras están
en la posición esperada.

### Cuándo NO usarlo

- **No reemplaza a `pdf_extractor.py`**: markitdown produce texto Markdown genérico.
  El extractor del proyecto aplica regex calibrados, normalización de campos, tolerancias
  de confianza, y la lógica `needs_review`. La extracción estructurada siempre pasa por
  `pdf_extractor.py`.

- **No reemplaza a `excel_extractor.py`**: markitdown convierte Excel con cabeceras
  `Unnamed: N` en celdas fusionadas — es ilegible para el pipeline. El extractor usa
  `map_columns()` con alias flexibles para manejar variaciones de layout real.

- **No escribe nada**: markitdown es de solo lectura. Todo output va a la conversación,
  nunca a `Services Data/` ni a `exports/`.

### Regla de orden en sesiones de depuración

```
1. markitdown → ver contenido crudo del archivo
2. pdf_extractor / excel_extractor → extracción estructurada
3. analysis_engine → cálculo de errores y PASS/FAIL
4. persistence_service → persistencia en DuckDB
```

Si hay discrepancia entre lo que markitdown muestra y lo que el extractor produce,
el problema está en el mapeo de campos o en los regex — no en el archivo fuente.

### Instalación / configuración

```
Venv dedicado:   C:\Users\AllamRodriguez\.claude\mcp-envs\markitdown\
Ejecutable:      ...Scripts\markitdown-mcp.exe  (STDIO transport)
Registro:        claude mcp add markitdown ... -s user
Dependencias:    markitdown[pdf], markitdown[xlsx], mcp~=1.8.0
```

Para verificar el estado: `claude mcp get markitdown`

---

## Task Documentation — `docs/Tareas`

Todo prompt que implique trabajo implementable — feature, fix, refactor, test, docs, o cualquier modificación — debe producir una carpeta de tarea **antes de que comience la implementación**.

### Estructura de carpetas

```
docs/
└── Tareas/
    └── <nombre-carpeta-tarea>/
        └── TASK.md
```

**Nombre de carpeta:** kebab-case, descriptivo y específico al trabajo a realizar.

| Tipo | Ejemplo |
|------|---------|
| Feature | `feat-dashboard-limit-passfail` |
| Bug fix | `fix-duckdb-wal-corruption` |
| Refactor | `refactor-analysis-engine` |
| Tests | `test-calibration-routes` |
| Docs | `docs-pdf-extraction-rules` |

### Reglas

1. Crear la carpeta y `TASK.md` **antes** de comenzar la implementación — no después.
2. Un solo `TASK.md` por carpeta. No agregar archivos adicionales salvo que la tarea lo requiera explícitamente.
3. Actualizar el checklist de completitud conforme se van terminando los ítems.
4. Antes de cerrar el PR, todos los ítems del checklist en `TASK.md` deben estar marcados.

### Formato requerido de `TASK.md`

````markdown
# <Título de la Tarea>

## Objective
<Qué logra esta tarea — 1 a 3 oraciones.>

## Context
<Por qué se necesita este cambio: comportamiento previo, restricciones, contexto relevante.>

## Scope
<Qué está dentro del alcance y qué queda explícitamente fuera.>

## Files & Modules Involved
- `path/to/file.py` — razón por la que está involucrado
- `path/to/component.tsx` — razón por la que está involucrado

## Implementation Steps
1. Paso uno
2. Paso dos
3. (continuar según sea necesario)

## Validation Steps
1. Test o verificación a ejecutar
2. Resultado esperado para confirmar correctitud

## Completion Criteria
- [ ] Implementación completa
- [ ] Tests unitarios escritos y pasando
- [ ] Tests de integración pasando (si se añadió o modificó un endpoint)
- [ ] Suite completa de tests pasando para el módulo afectado
- [ ] Checklist de TASK.md actualizado
- [ ] Usuario validó los cambios en el dashboard (browser) y confirmó comportamiento correcto
- [ ] PR creado y mergeado a la rama de origen

## Risks & Dependencies
- Riesgo o dependencia (omitir esta sección si no aplica)
````

---

## Git Workflow

### Nomenclatura de ramas

Crear una rama nueva antes de comenzar cualquier tarea. El nombre debe corresponder al nombre de la carpeta en `docs/Tareas` y llevar como prefijo el nombre de la rama de origen.

```
<rama-origen>-feature/<nombre-carpeta-tarea>   # features, mejoras, documentación
<rama-origen>-fix/<nombre-carpeta-tarea>       # correcciones de bugs
<rama-origen>-test/<nombre-carpeta-tarea>      # tareas solo de tests
<rama-origen>-refactor/<nombre-carpeta-tarea>  # refactors sin cambio de comportamiento
```

Ejemplos:
- `main-feature/feat-dashboard-limit-passfail`
- `main-fix/fix-duckdb-wal-corruption`
- `main-refactor/refactor-analysis-engine`

Para obtener el nombre de la rama actual antes de crear la rama de tarea:
```bash
git rev-parse --abbrev-ref HEAD
```

### Mensajes de commit — Conventional Commits

Los commits deben ser atómicos: un cambio lógico por commit.

| Prefijo | Usar para |
|---------|-----------|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `docs:` | Solo documentación |
| `test:` | Agregar o actualizar tests |
| `refactor:` | Reestructuración de código, sin cambio de comportamiento |
| `chore:` | Build, dependencias, tooling |

### Pull Requests

**No crear un PR hasta que el usuario haya validado los cambios en el dashboard del browser.**

La secuencia requerida es:

1. Todos los tests automatizados pasan (ver sección Testing).
2. Actualizar y verificar el checklist de `TASK.md` — cada ítem debe estar marcado.
3. **Pedir al usuario que corra el proyecto y valide los cambios en el dashboard.** Esperar su respuesta antes de continuar.
4. Si el usuario reporta errores, comportamiento inesperado o solicita cambios: resolverlos, re-ejecutar tests y pedir validación nuevamente.
5. Solo después de que el usuario confirme explícitamente que todo funciona y no tiene más cambios — crear el PR.

Crear el PR con:
- **Título**: claro y descriptivo, alineado con el objetivo de la tarea
- **Body**: resumen de cambios realizados, enfoque de testing, link a `docs/Tareas/<nombre-carpeta>/TASK.md`

**Excepción:** si el usuario solicita explícitamente crear el PR antes de la validación (ej. "crea el PR ahora"), proceder de inmediato sin esperar validación.

### Política de merge — CRÍTICO

> **Mergear únicamente a la rama desde la cual se creó esta rama de tarea.**
>
> No mergear a `main` salvo que esa sea la rama de origen.
> No mergear a ninguna otra rama sin confirmación explícita.
>
> La única excepción es cuando el brief de tarea o el dueño del proyecto nombra explícitamente una rama destino diferente.

Si la rama destino no está clara, preguntar antes de mergear — nunca asumir `main`.

---

## Testing Requirements

Antes de marcar cualquier tarea como completa:

1. Escribir tests unitarios para toda funcionalidad nueva.
2. Ejecutar la suite completa:
   - Backend: `cd backend && pytest`
   - Frontend: `cd frontend && npx vitest run`
3. Si los tests fallan:
   - Analizar el output del fallo
   - Corregir el código (no los tests, salvo que los tests sean incorrectos)
   - Re-ejecutar hasta que todos pasen
4. Para endpoints de API, incluir tests de integración que verifiquen:
   - Respuestas exitosas con input válido
   - Casos borde relevantes al dominio de calibración

## Test Commands

```bash
# Backend
cd backend && pytest                          # suite completa
cd backend && pytest tests/test_health.py -v  # archivo específico
cd backend && ruff check .                    # lint
cd backend && black --check .                 # format check

# Frontend
cd frontend && npx vitest run                 # suite completa
cd frontend && npm run lint                   # lint
```