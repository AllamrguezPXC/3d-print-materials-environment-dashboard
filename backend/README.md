# Backend

FastAPI + SQLAlchemy + SQLite backend for the 3D Print Materials Environment Data Monitoring
Dashboard. See the root `README.md` for full setup instructions and `docs/Requirements.md` for the
specification.

## Quick start

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # Windows
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
.venv\Scripts\python -m pytest -q
```

## Environment variables

See `../.env.example` at the repo root:

```
APP_ENV=development
DATABASE_URL=sqlite:///./environment_monitor.db
SENSOR_MODE=mock
DRACAL_SERIAL_NUMBER=E27297
DRACAL_VCP_PORT=COM3
MOCK_SENSOR_COUNT=3
CORS_ORIGINS=http://localhost:5173
```
