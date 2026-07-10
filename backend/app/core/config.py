from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./environment_monitor.db"
    # Used only by db/seed.py to create the initial real/mock sensor rows on
    # first run -- sensors are configured per-row (see app.models.sensor.Sensor)
    # and no longer selected via a global runtime mode.
    dracal_serial_number: str = "E25877"
    dracal_vcp_port: str = "COM3"
    # Path to Dracal's `dracal-usb-get` CLI tool, used by DracalCliSensorReader
    # for devices whose Windows driver exposes them as a generic USB device
    # rather than a virtual COM port (no serial port to open in that case).
    # Machine-level install-location config, not a per-sensor property -- like
    # database_url, it belongs in Settings rather than on the Sensor row.
    dracal_cli_executable: str = "dracal-usb-get"
    mock_sensor_count: int = 3
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
