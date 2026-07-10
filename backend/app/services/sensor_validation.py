"""Cross-field validation shared by Sensor create/update (service layer) and
the startup seed script, so both enforce identical rules.

Lives here (not as a Pydantic @model_validator on SensorCreate/SensorUpdate)
because SensorUpdate is a partial PATCH: a payload of {"sensor_type": "mock"}
carries no serial_number at all, so only the service layer -- which has the
sensor's current merged state -- can validate it correctly.
"""

VALID_SENSOR_TYPES = {"dracal_vcp", "dracal_cli", "mock"}
FORBIDDEN_MOCK_SERIAL = "E25877"
MOCK_SERIAL_PREFIX = "MOCK-"


def validate_sensor_fields(*, sensor_type: str, serial_number: str, port: str | None) -> None:
    """Raise ValueError with a user-facing message on any rule violation."""
    if sensor_type not in VALID_SENSOR_TYPES:
        raise ValueError(
            f"Unsupported sensor_type {sensor_type!r}. Must be one of: "
            f"{', '.join(sorted(VALID_SENSOR_TYPES))}."
        )

    if sensor_type == "mock":
        if serial_number == FORBIDDEN_MOCK_SERIAL:
            raise ValueError(
                f"Mock sensors may not use {FORBIDDEN_MOCK_SERIAL!r} — that serial is reserved "
                "for the real Dracal hardware."
            )
        if not serial_number.startswith(MOCK_SERIAL_PREFIX):
            raise ValueError(
                f"Mock sensor serial_number must start with {MOCK_SERIAL_PREFIX!r} "
                "to avoid ambiguity with real hardware."
            )

    if sensor_type in {"dracal_vcp", "dracal_cli"} and not port:
        raise ValueError(f"sensor_type {sensor_type!r} requires a non-empty port.")
