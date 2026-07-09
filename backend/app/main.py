from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import readings
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
