# Implementar DracalCliSensorReader (lectura Dracal vía USB nativo)

## Objective

Implementar el `sensor_type="dracal_cli"` (reservado en el esquema desde el inicio del proyecto
pero nunca implementado) para poder leer un sensor Dracal real cuyo driver de Windows lo expone
como dispositivo USB genérico en vez de puerto COM virtual (VCP), y usarlo para registrar el
sensor real del usuario (serial `E27297`) sin fabricar ninguna conexión.

## Context

Durante la validación en vivo de la detección de puertos (`docs/Tareas/printer-ams-sensor-config/`),
`GET /sensors/ports` no encontró ningún puerto COM real para el sensor Dracal conectado
(serial `E27297`, confirmado funcionando vía CalView y Device Manager como
`USB\VID_289B&PID_0505\E27297`, clase `USBDevice`). El registro `HKLM\HARDWARE\DEVICEMAP\SERIALCOMM`
confirmó que Windows no le asigna puerto COM alguno — su driver actual no está en modo VCP/CDC.
El usuario proporcionó el enfoque oficial de Dracal para este caso: su herramienta CLI
`dracal-usb-get` (confirmada instalada en `C:\Program Files (x86)\DracalView\dracal-usb-get.exe`,
probada en vivo devolviendo `101.04, 24.16, 53.52` para el serial real). Esto corresponde
exactamente al `sensor_type="dracal_cli"` que el esquema (`VALID_SENSOR_TYPES`, comentarios en
`docs/Requirements.md` §10.1) ya reservaba pero cuya factory nunca implementó
(`docs/Tasks.md` lo marcaba explícitamente como fuera de alcance del MVP).

## Scope

Dentro: `backend/app/sensors/dracal_cli.py` (nuevo), `backend/app/sensors/factory.py`,
`backend/app/services/sensor_validation.py` (relajar requisito de `port` — solo aplica a
`dracal_vcp`), `backend/app/core/config.py` (nuevo `dracal_cli_executable`),
`frontend/src/components/SensorForm.tsx` (ocultar campo de puerto para `dracal_cli`), tests
correspondientes, documentación (`docs/Requirements.md`, `docs/Tasks.md`, `.env.example`,
`README.md`).

Fuera: cambios al parser VCP existente, cambios a `DracalVcpSensorReader`, cualquier UI nueva más
allá de la ya existente en `Sensors.tsx` (el formulario ya soporta seleccionar `sensor_type`, solo
se ajustó qué campos requiere cada tipo).

## Files & Modules Involved

- `backend/app/sensors/dracal_cli.py` (nuevo) — `DracalCliSensorReader`
- `backend/app/sensors/factory.py` — rama `dracal_cli`
- `backend/app/services/sensor_validation.py` — `port` requerido solo para `dracal_vcp`
- `backend/app/core/config.py` — `dracal_cli_executable: str = "dracal-usb-get"`
- `frontend/src/components/SensorForm.tsx` — `REQUIRES_PORT` ya no incluye `dracal_cli`
- `backend/tests/sensors/test_dracal_cli.py` (nuevo), `test_factory.py`, `test_sensors.py`
- `docs/Requirements.md` §10.1, `docs/Tasks.md`, `.env.example`, `README.md`

## Implementation Steps

1. `DracalCliSensorReader` — envuelve `subprocess.check_output(["dracal-usb-get", "-i", "0,1,2",
   "-s", serial])`, parsea `pressure_kPa, temperature_C, rh_percent`, maneja
   `CalledProcessError`/`TimeoutExpired`/salida malformada como `SensorParseError` (el ejecutable
   faltante ya se propaga como `OSError`, capturado igual que `dracal_vcp` en las capas superiores).
2. `factory.py` — nueva rama `dracal_cli` → `DracalCliSensorReader(serial_number=sensor.serial_number)`.
3. `sensor_validation.py` — el requisito de `port` no-vacío aplica solo a `dracal_vcp`.
4. `config.py` — nuevo `dracal_cli_executable`, consumido solo por el reader (config de
   instalación de máquina, no propiedad por-sensor).
5. `SensorForm.tsx` — el campo Puerto/`PortSelect` ya no se muestra para `dracal_cli`.
6. Tests con `subprocess.check_output` mockeado (sin depender del binario real ni del hardware).
7. Documentación actualizada.
8. Registrar el sensor real (serial `E27297`) vía la API en una ubicación arbitraria y confirmar
   una lectura en vivo end-to-end.

## Validation Steps

1. `cd backend && pytest -q` — suite completa en verde.
2. `cd frontend && npx tsc -b` sin errores.
3. Registro real: crear ubicación + sensor `dracal_cli` con serial `E27297` vía `POST /sensors`,
   confirmar `GET /readings/current` devuelve una lectura real (no error) para ese sensor.

## Completion Criteria

- [x] `DracalCliSensorReader` implementado y testeado (mocks, sin hardware real en CI)
- [x] Factory y validación actualizadas (`dracal_cli` no requiere `port`)
- [x] `SensorForm.tsx` ajustado
- [x] Documentación actualizada (Requirements, Tasks, .env.example, README)
- [x] Sensor real (`E27297`) registrado y validado con una lectura en vivo
