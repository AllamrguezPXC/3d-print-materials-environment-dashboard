"""Import all models so Base.metadata.create_all() and relationship string
lookups can see the complete mapper registry."""

from app.models.alert import Alert
from app.models.drying_session import DryingSession
from app.models.filament_spool import FilamentSpool
from app.models.location import Location
from app.models.material_profile import MaterialProfile
from app.models.printer import Printer
from app.models.reading import Reading
from app.models.sensor import Sensor
from app.models.spool_assignment import SpoolAssignment

__all__ = [
    "Alert",
    "DryingSession",
    "FilamentSpool",
    "Location",
    "MaterialProfile",
    "Printer",
    "Reading",
    "Sensor",
    "SpoolAssignment",
]
