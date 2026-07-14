import asyncio
from contextlib import asynccontextmanager, suppress
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import drying, readings
from app.api.v1 import alerts, assignments, locations, materials, printers, sensors, spools
from app.core.config import get_settings
from app.db.base import Base
from app.db.seed import seed
from app.db.session import SessionLocal, engine
from app.services.auto_capture import run_auto_capture_loop

# Import models so their tables are registered on Base.metadata before
# create_all() runs.
from app import models  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed(session)

    auto_capture_task = None
    if settings.auto_capture_interval_seconds > 0:
        auto_capture_task = asyncio.create_task(
            run_auto_capture_loop(settings.auto_capture_interval_seconds)
        )

    yield

    if auto_capture_task is not None:
        auto_capture_task.cancel()
        with suppress(asyncio.CancelledError):
            await auto_capture_task


app = FastAPI(
    title="3D Print Materials Environment Data Monitoring Dashboard",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # No cookie/session auth is used anywhere in this app (see
    # frontend/src/api/client.ts), so credentialed CORS is unnecessary
    # attack surface and is disabled. See evidence/security-review.md.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(readings.router)
app.include_router(drying.router)

# CRUD routers for the extended entities (Requirements.md section 12.2).
app.include_router(sensors.router)
app.include_router(printers.router)
app.include_router(locations.router)
app.include_router(materials.router)
app.include_router(spools.router)
app.include_router(assignments.router)
app.include_router(alerts.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
