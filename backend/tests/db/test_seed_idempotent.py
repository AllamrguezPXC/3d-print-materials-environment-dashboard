from app.db.seed import seed
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.printer import Printer
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment

MODELS = [Sensor, Location, Printer, MaterialProfile, FilamentSpool, SpoolAssignment]


def _counts(session) -> dict[str, int]:
    return {model.__name__: session.query(model).count() for model in MODELS}


def test_seed_is_idempotent(db_session):
    seed(db_session)
    first_counts = _counts(db_session)

    # Sanity: seeding actually inserted rows.
    assert first_counts["Printer"] == 7
    assert first_counts["MaterialProfile"] == 11
    assert first_counts["Sensor"] >= 1
    assert first_counts["FilamentSpool"] > 0

    seed(db_session)
    second_counts = _counts(db_session)

    assert second_counts == first_counts


def test_seed_creates_real_dracal_sensor(db_session):
    seed(db_session)

    real_sensor = db_session.query(Sensor).filter_by(serial_number="E27297").first()
    assert real_sensor is not None
    assert real_sensor.sensor_type == "dracal_vcp"
    assert real_sensor.model == "VCP-PTH450-CAL"
    assert real_sensor.port, "real Dracal sensor row must have a non-null port"


def test_seed_never_assigns_real_serial_to_a_mock_sensor(db_session):
    seed(db_session)

    mock_sensors = db_session.query(Sensor).filter_by(sensor_type="mock").all()
    assert len(mock_sensors) > 0
    for sensor in mock_sensors:
        assert sensor.serial_number != "E27297"
        assert sensor.serial_number.startswith("MOCK-")
