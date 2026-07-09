import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Importing app.models registers every mapped class on the shared Base
# metadata, which is required before create_all()/relationship string
# lookups will work.
from app import models  # noqa: F401
from app.db.base import Base


@pytest.fixture
def in_memory_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(in_memory_engine) -> Session:
    Base.metadata.create_all(bind=in_memory_engine)
    session_factory = sessionmaker(bind=in_memory_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
