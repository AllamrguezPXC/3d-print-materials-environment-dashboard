"""Idempotent startup seed data per docs/Requirements.md §7 and §13.4.

Every insert here is guarded by a check against an existing row so calling
seed(session) multiple times (e.g. on every app restart) never creates
duplicates.
"""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.printer import Printer
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment
from app.services.sensor_validation import validate_sensor_fields

# --- Material profile seed data (Requirements.md §7) ---------------------
# Temperature bands are not broken out per-material in §7 (only a shared
# "18-30C typical room temp target" is given), so every family uses the
# same ideal band (18-30C) with a symmetric +/-5C warning margin and
# +/-10C critical margin. Ranges given as "X-Y C for A-B h" are stored as a
# representative midpoint in drying_temp_c, with the original range
# preserved in drying_notes for the frontend to display verbatim.
_IDEAL_TEMP_MIN_C = 18.0
_IDEAL_TEMP_MAX_C = 30.0
_WARNING_TEMP_MIN_C = _IDEAL_TEMP_MIN_C - 5.0
_WARNING_TEMP_MAX_C = _IDEAL_TEMP_MAX_C + 5.0
_CRITICAL_TEMP_MIN_C = _IDEAL_TEMP_MIN_C - 10.0
_CRITICAL_TEMP_MAX_C = _IDEAL_TEMP_MAX_C + 10.0

MATERIAL_PROFILE_SEEDS: list[dict] = [
    {
        "name": "PLA",
        "family": "PLA-derived",
        "ideal_rh_max_percent": 40.0,
        "warning_rh_max_percent": 50.0,
        "critical_rh_max_percent": 60.0,
        "drying_temp_c": 45.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Covers PLA, PLA+, Silk PLA, Matte PLA, PLA-CF, PLA-GF.",
        "drying_notes": "Dry at 45C for 4-6h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    # Manufacturer-specific override example (Requirements.md section 7 rule 1;
    # CLAUDE.md Domain Rules): same family as generic "PLA" above, but a
    # distinct, tighter profile a spool can be assigned to instead. Numbers
    # are illustrative only, not sourced from Prusament's published spec --
    # replace with real manufacturer data when available.
    {
        "name": "Prusament PLA",
        "family": "PLA-derived",
        "manufacturer": "Prusament",
        "ideal_rh_max_percent": 35.0,
        "warning_rh_max_percent": 45.0,
        "critical_rh_max_percent": 55.0,
        "drying_temp_c": 45.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Prusament-specific PLA. Vacuum-sealed with desiccant from the factory.",
        "drying_notes": "Dry at 45C for 4-6h.",
        "source_notes": (
            "Illustrative manufacturer-specific override example (tighter RH tolerance than "
            "generic PLA) -- not sourced from Prusament's official published spec."
        ),
    },
    {
        "name": "PETG",
        "family": "PET-derived",
        "ideal_rh_max_percent": 30.0,
        "warning_rh_max_percent": 40.0,
        "critical_rh_max_percent": 50.0,
        "drying_temp_c": 60.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Covers PETG, PETG-CF, CPE, co-polyesters.",
        "drying_notes": "Dry at 55-65C for 4-6h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "ABS",
        "family": "ABS-derived",
        "ideal_rh_max_percent": 35.0,
        "warning_rh_max_percent": 45.0,
        "critical_rh_max_percent": 55.0,
        "drying_temp_c": 70.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Covers ABS, ABS-GF, ABS-CF.",
        "drying_notes": "Dry at 65-75C for 4-6h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "ASA",
        "family": "ASA-derived",
        "ideal_rh_max_percent": 35.0,
        "warning_rh_max_percent": 45.0,
        "critical_rh_max_percent": 55.0,
        "drying_temp_c": 70.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Covers ASA, ASA-CF.",
        "drying_notes": "Dry at 65-75C for 4-6h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "Nylon",
        "family": "PA-derived",
        "ideal_rh_max_percent": 15.0,
        "warning_rh_max_percent": 25.0,
        "critical_rh_max_percent": 35.0,
        "drying_temp_c": 80.0,
        "drying_time_hours_min": 8.0,
        "drying_time_hours_max": 12.0,
        "storage_notes": "Covers PA6, PA12, PA-CF, PA-GF, Nylon blends.",
        "drying_notes": "Dry at 70-90C for 8-12h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "PC",
        "family": "PC-derived",
        "ideal_rh_max_percent": 20.0,
        "warning_rh_max_percent": 30.0,
        "critical_rh_max_percent": 40.0,
        "drying_temp_c": 85.0,
        "drying_time_hours_min": 6.0,
        "drying_time_hours_max": 8.0,
        "storage_notes": "Covers PC, PC blend, PC-CF.",
        "drying_notes": "Dry at 80-90C for 6-8h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "TPU",
        "family": "TPU-derived",
        "ideal_rh_max_percent": 25.0,
        "warning_rh_max_percent": 35.0,
        "critical_rh_max_percent": 45.0,
        "drying_temp_c": 55.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 8.0,
        "storage_notes": "Covers TPU 95A, TPE, flexible blends.",
        "drying_notes": "Dry at 50-60C for 4-8h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "PVB",
        "family": "PVB-derived",
        "ideal_rh_max_percent": 30.0,
        "warning_rh_max_percent": 40.0,
        "critical_rh_max_percent": 50.0,
        "drying_temp_c": 58.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 6.0,
        "storage_notes": "Covers PVB, Polysmooth-style materials.",
        "drying_notes": "Dry at 55-60C for 4-6h.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "PVA",
        "family": "PVA-derived",
        "ideal_rh_max_percent": 10.0,
        "warning_rh_max_percent": 20.0,
        "critical_rh_max_percent": 30.0,
        "drying_temp_c": 50.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 8.0,
        "storage_notes": "PVA support material. Store sealed.",
        "drying_notes": "Dry at 45-55C for 4-8h; store sealed.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
    {
        "name": "BVOH",
        "family": "BVOH-derived",
        "ideal_rh_max_percent": 10.0,
        "warning_rh_max_percent": 20.0,
        "critical_rh_max_percent": 30.0,
        "drying_temp_c": 50.0,
        "drying_time_hours_min": 4.0,
        "drying_time_hours_max": 8.0,
        "storage_notes": "BVOH support material. Store sealed.",
        "drying_notes": "Dry at 45-55C for 4-8h; store sealed.",
        "source_notes": "Requirements.md section 7 seed defaults.",
    },
]

# --- Printer seed data (Requirements.md section 6/13.4: 4x A1 mini, 2x P1S, 1x P1P) ---
# Printer's natural business key is `name` (not brand+model), since multiple
# identical units share brand/model but must remain distinct rows.
# filament_system_type is set to match the AMS locations already seeded
# below: only "A1 mini #1" and "P1S #1" get real AMS slot Location rows, so
# only those two are marked "ams" here -- everything else defaults to
# "external_spool" rather than claiming an AMS that doesn't actually exist.
PRINTER_SEEDS: list[dict] = [
    {"name": "A1 mini #1", "brand": "Bambu Lab", "model": "A1 mini", "filament_system_type": "ams"},
    {"name": "A1 mini #2", "brand": "Bambu Lab", "model": "A1 mini", "filament_system_type": "external_spool"},
    {"name": "A1 mini #3", "brand": "Bambu Lab", "model": "A1 mini", "filament_system_type": "external_spool"},
    {"name": "A1 mini #4", "brand": "Bambu Lab", "model": "A1 mini", "filament_system_type": "external_spool"},
    {"name": "P1S #1", "brand": "Bambu Lab", "model": "P1S", "filament_system_type": "ams"},
    {"name": "P1S #2", "brand": "Bambu Lab", "model": "P1S", "filament_system_type": "external_spool"},
    {"name": "P1P #1", "brand": "Bambu Lab", "model": "P1P", "filament_system_type": "external_spool"},
]

REAL_SENSOR_SERIAL = "E25877"
REAL_SENSOR_MODEL = "VCP-PTH450-CAL"


def _get_or_create_printer(session: Session, spec: dict) -> Printer:
    existing = session.query(Printer).filter_by(name=spec["name"]).first()
    if existing:
        return existing
    printer = Printer(
        name=spec["name"],
        brand=spec["brand"],
        model=spec["model"],
        filament_system_type=spec.get("filament_system_type", "manual"),
    )
    session.add(printer)
    session.flush()
    return printer


def _get_or_create_location(session: Session, name: str, **fields) -> Location:
    existing = session.query(Location).filter_by(name=name).first()
    if existing:
        return existing
    location = Location(name=name, **fields)
    session.add(location)
    session.flush()
    return location


def _get_or_create_sensor(session: Session, serial_number: str, **fields) -> Sensor:
    existing = session.query(Sensor).filter_by(serial_number=serial_number).first()
    if existing:
        return existing
    validate_sensor_fields(
        sensor_type=fields["sensor_type"],
        serial_number=serial_number,
        port=fields.get("port"),
    )
    sensor = Sensor(serial_number=serial_number, **fields)
    session.add(sensor)
    session.flush()
    return sensor


def _get_or_create_material_profile(session: Session, spec: dict) -> MaterialProfile:
    existing = (
        session.query(MaterialProfile)
        .filter_by(name=spec["name"], family=spec["family"])
        .first()
    )
    if existing:
        return existing
    profile = MaterialProfile(
        name=spec["name"],
        family=spec["family"],
        manufacturer=spec.get("manufacturer"),
        ideal_temp_min_c=_IDEAL_TEMP_MIN_C,
        ideal_temp_max_c=_IDEAL_TEMP_MAX_C,
        warning_temp_min_c=_WARNING_TEMP_MIN_C,
        warning_temp_max_c=_WARNING_TEMP_MAX_C,
        critical_temp_min_c=_CRITICAL_TEMP_MIN_C,
        critical_temp_max_c=_CRITICAL_TEMP_MAX_C,
        ideal_rh_max_percent=spec["ideal_rh_max_percent"],
        warning_rh_max_percent=spec["warning_rh_max_percent"],
        critical_rh_max_percent=spec["critical_rh_max_percent"],
        drying_temp_c=spec["drying_temp_c"],
        drying_time_hours_min=spec["drying_time_hours_min"],
        drying_time_hours_max=spec["drying_time_hours_max"],
        storage_notes=spec.get("storage_notes"),
        drying_notes=spec.get("drying_notes"),
        source_notes=spec.get("source_notes"),
    )
    session.add(profile)
    session.flush()
    return profile


def seed(session: Session) -> None:
    """Populate default reference/demo data if it does not already exist.

    Safe to call on every application startup: every insert is guarded by a
    natural-key lookup, so repeated calls never create duplicate rows.
    """
    settings = get_settings()

    # --- Printers -----------------------------------------------------
    printers_by_name = {spec["name"]: _get_or_create_printer(session, spec) for spec in PRINTER_SEEDS}

    # --- Material profiles ---------------------------------------------
    profiles_by_name = {
        spec["name"]: _get_or_create_material_profile(session, spec) for spec in MATERIAL_PROFILE_SEEDS
    }

    # --- Real Dracal sensor + its location -----------------------------
    real_sensor_location = _get_or_create_location(
        session,
        "Primary Filament Storage Room",
        location_type="room",
        description="Room housing the primary printer fleet and filament storage.",
    )
    _get_or_create_sensor(
        session,
        REAL_SENSOR_SERIAL,
        name=f"Dracal {REAL_SENSOR_SERIAL}",
        model=REAL_SENSOR_MODEL,
        sensor_type="dracal_vcp",
        port=settings.dracal_vcp_port,
        is_active=True,
        location_id=real_sensor_location.id,
    )

    # --- Mock sensors + matching demo locations -------------------------
    demo_location_specs = [
        {
            "name": "AMS Slot 1 - A1 mini #1",
            "location_type": "printer_ams",
            "printer_id": printers_by_name["A1 mini #1"].id,
            "description": "AMS slot 1 on A1 mini #1.",
        },
        {
            "name": "Storage Box A",
            "location_type": "storage_box",
            "description": "Sealed storage box for spare spools.",
        },
        {
            "name": "Dry Box 1",
            "location_type": "dry_box",
            "description": "Passive dry box with desiccant, used for short-term storage.",
            "max_temp_c": 45.0,
            "notes": "Passive dry box only; no active heater.",
        },
    ]

    mock_sensors: list[Sensor] = []
    for i in range(settings.mock_sensor_count):
        spec = demo_location_specs[i] if i < len(demo_location_specs) else {
            "name": f"Demo Location {i + 1}",
            "location_type": "room",
            "description": "Additional demo location for extra mock sensors.",
        }
        location = _get_or_create_location(session, spec["name"], **{k: v for k, v in spec.items() if k != "name"})
        serial = f"MOCK-{i + 1:04d}"
        sensor = _get_or_create_sensor(
            session,
            serial,
            name=f"Mock Sensor {i + 1}",
            model="mock",
            sensor_type="mock",
            port=None,
            is_active=True,
            location_id=location.id,
        )
        mock_sensors.append(sensor)

    # --- AMS slot ordering (printer-ams-sensor-config task, Phase 1) ----
    # Backfill slot_index on the already-seeded lone AMS location for A1
    # mini #1 so every printer_ams row has a stable ordinal.
    existing_ams_slot_1 = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
    if existing_ams_slot_1 is not None and existing_ams_slot_1.slot_index is None:
        existing_ams_slot_1.slot_index = 0

    # Seed a full 4-slot AMS for P1S #1 to demonstrate a real multi-slot
    # grid. Printers with no explicitly-seeded AMS location show "no AMS
    # configured" in the UI instead of a fabricated grid.
    p1s_1 = printers_by_name.get("P1S #1")
    if p1s_1 is not None:
        for slot_index in range(4):
            _get_or_create_location(
                session,
                f"AMS Slot {slot_index + 1} - P1S #1",
                location_type="printer_ams",
                printer_id=p1s_1.id,
                description=f"AMS slot {slot_index + 1} on P1S #1.",
                slot_index=slot_index,
            )

    # --- External-spool location demo (dashboard-device-redesign task) --
    # No `printer_external_spool` Location was ever seeded before this task
    # -- every "external_spool" printer had zero locations of its own. Adds
    # one real row (no sensor of its own; an external spool holder has no
    # consolidated environmental reading) so the Dashboard's external-spool
    # slot visual is demonstrable against real data, not just its empty state.
    a1_mini_2 = printers_by_name.get("A1 mini #2")
    if a1_mini_2 is not None:
        _get_or_create_location(
            session,
            "External Spool - A1 mini #2",
            location_type="printer_external_spool",
            printer_id=a1_mini_2.id,
            description="External spool holder on A1 mini #2.",
        )

    # --- Shared AMS-module sensor demo (sensor-per-ams-module task) -----
    # Physically, one sensor covers an entire AMS module's shared
    # microclimate. This sensor is assigned to slot 1, but a demo spool
    # below is assigned to slot 3 of the *same* AMS -- both are covered by
    # this one sensor's reading (see alert_service.get_affected_spools),
    # demonstrating the shared-sensor behavior without manual setup.
    p1s_1_slot_1 = session.query(Location).filter_by(name="AMS Slot 1 - P1S #1").first()
    if p1s_1_slot_1 is not None:
        _get_or_create_sensor(
            session,
            "MOCK-0004",
            name="Mock Sensor 4",
            model="mock",
            sensor_type="mock",
            port=None,
            is_active=True,
            location_id=p1s_1_slot_1.id,
        )

    # --- Demo filament spools + assignments -----------------------------
    # FilamentSpool/SpoolAssignment have no natural business key of their
    # own (they're free-form demo inventory), so idempotency here is
    # enforced by only seeding this block when no spools exist yet.
    if session.query(FilamentSpool).count() == 0 and mock_sensors:
        ams_slot_1 = session.query(Location).filter_by(name="AMS Slot 1 - A1 mini #1").first()
        storage_box_a = session.query(Location).filter_by(name="Storage Box A").first()
        p1s_1_slot_3 = session.query(Location).filter_by(name="AMS Slot 3 - P1S #1").first()
        a1_mini_2_ext_spool = session.query(Location).filter_by(name="External Spool - A1 mini #2").first()

        demo_spools = [
            {
                "material_profile_id": profiles_by_name["PLA"].id,
                "brand": "Generic",
                "color": "Black",
                "location": ams_slot_1,
                "slot_name": "AMS Slot 1",
                "status": "ready",
            },
            {
                "material_profile_id": profiles_by_name["PETG"].id,
                "brand": "Generic",
                "color": "Orange",
                "location": storage_box_a,
                "slot_name": None,
                "status": "watch",
            },
            {
                # Assigned to a different slot of P1S #1's AMS than "Mock
                # Sensor 4" (slot 1) -- demonstrates that one shared sensor
                # covers spools in any of its AMS module's sibling slots.
                "material_profile_id": profiles_by_name["PLA"].id,
                "brand": "Generic",
                "color": "Silver",
                "location": p1s_1_slot_3,
                "slot_name": "AMS Slot 3",
                "status": "ready",
            },
            {
                "material_profile_id": profiles_by_name["PETG"].id,
                "brand": "Generic",
                "color": "Blue",
                "location": a1_mini_2_ext_spool,
                "slot_name": "External Spool",
                "status": "ready",
            },
        ]

        for spec in demo_spools:
            location = spec["location"]
            if location is None:
                continue
            spool = FilamentSpool(
                material_profile_id=spec["material_profile_id"],
                brand=spec["brand"],
                color=spec["color"],
                status=spec["status"],
            )
            session.add(spool)
            session.flush()

            assignment = SpoolAssignment(
                spool_id=spool.id,
                location_id=location.id,
                slot_name=spec["slot_name"],
                is_active=True,
            )
            session.add(assignment)

    session.commit()
