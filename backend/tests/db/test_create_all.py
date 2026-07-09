from sqlalchemy import inspect

from app import models  # noqa: F401
from app.db.base import Base


def test_create_all_creates_every_model_table(in_memory_engine):
    Base.metadata.create_all(bind=in_memory_engine)

    inspector = inspect(in_memory_engine)
    table_names = set(inspector.get_table_names())

    expected_tables = {
        "sensors",
        "locations",
        "printers",
        "material_profiles",
        "filament_spools",
        "spool_assignments",
        "readings",
        "alerts",
        "drying_sessions",
    }
    assert expected_tables.issubset(table_names)
