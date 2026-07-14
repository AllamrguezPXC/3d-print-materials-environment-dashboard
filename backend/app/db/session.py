from collections.abc import Generator

from sqlalchemy import create_engine, event
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

if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:  # noqa: ANN001
        """SQLite ignores FOREIGN KEY constraints declared in the schema
        unless this pragma is set per-connection -- without it, every model's
        `ForeignKey(...)` column is decorative only, and services that don't
        explicitly re-check a referenced row's existence (see the various
        `_check_*_exists` helpers) can silently persist a dangling reference.
        WAL journal mode lets the auto_capture background loop (a writer)
        coexist with concurrent read requests without blocking; it's a no-op
        for the in-memory DB tests use.
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
