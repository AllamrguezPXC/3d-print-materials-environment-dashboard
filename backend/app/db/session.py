from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()

_connect_args: dict[str, object] = {}
_engine_kwargs: dict[str, object] = {}
if settings.database_url.startswith("sqlite"):
    # SQLite connections are single-threaded by default; FastAPI may hand
    # requests to a worker thread pool, so relax that restriction. This
    # connect_arg is specific to SQLite and must not be applied to other
    # database backends.
    _connect_args["check_same_thread"] = False

    if ":memory:" in settings.database_url:
        # An in-memory SQLite database only exists on a single connection;
        # StaticPool keeps that one connection alive for the whole process
        # (used for tests), instead of a fresh empty DB per checkout.
        _engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.database_url, connect_args=_connect_args, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
