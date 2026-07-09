from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import readings
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="3D Print Materials Environment Data Monitoring Dashboard")

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
