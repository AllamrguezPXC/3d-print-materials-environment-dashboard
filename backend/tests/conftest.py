import os

# Must be set before `app.main`/`app.db.session` are imported anywhere, since
# their module-level `get_settings()` calls are cached for the process lifetime.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.alert import Alert  # noqa: E402
from app.models.reading import Reading  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    # Entering as a context manager triggers FastAPI's lifespan (create_all + seed).
    # The underlying SQLite is in-memory and shared (via StaticPool) across the
    # whole test session, so reading/alert history from a prior test would
    # otherwise leak into this one — clear it before each test while keeping
    # the idempotent reference/demo seed data (sensors, printers, materials, spools).
    with TestClient(app) as test_client:
        with SessionLocal() as session:
            session.query(Alert).delete()
            session.query(Reading).delete()
            session.commit()
        yield test_client
