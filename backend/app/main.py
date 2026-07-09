from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import drying, readings
from app.api.v1 import alerts, assignments, locations, materials, printers, sensors, spools
from app.core.config import get_settings
from app.db.base import Base
from app.db.seed import seed
from app.db.session import SessionLocal, engine

# Import models so their tables are registered on Base.metadata before
# create_all() runs.
from app import models  # noqa: F401

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed(session)
    yield


app = FastAPI(
    title="3D Print Materials Environment Data Monitoring Dashboard",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
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
