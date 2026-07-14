import type { Location, LocationInfo, Printer, Sensor } from "@/types/api";

/** Physically, one sensor covers an entire printer module's (e.g. an AMS)
 * shared microclimate -- not one slot. Labeling a reading/sensor by its
 * exact slot name ("AMS Slot 1 - P1S #1") misleadingly implies it only
 * covers that one slot, so AMS-slot locations are relabeled by printer
 * instead ("P1S #1 — AMS"). Non-AMS locations render their plain name. */
export function describeSensorLocation(
  location: Location | LocationInfo,
  printers: Printer[],
): string {
  if (location.location_type === "printer_ams" && location.printer_id !== null) {
    const printer = printers.find((p) => p.id === location.printer_id);
    if (printer) return `${printer.name} — AMS`;
  }
  return location.name;
}

export interface LocationOption {
  id: number;
  label: string;
}

/** Physically, one sensor covers an entire AMS module's shared microclimate
 * -- collapse that printer's AMS slots to a single option (the lowest
 * slot_index as the representative location_id), so a picker can't imply
 * "slot 3" is a different choice from "slot 0". Non-AMS locations are
 * listed individually, unchanged. Shared by SensorForm.tsx (the /sensors
 * admin form) and SensorAssignmentModal.tsx (the Dashboard-embedded
 * control), so both offer the exact same collapsed choices. */
export function buildLocationOptions(locations: Location[], printers: Printer[]): LocationOption[] {
  const amsByPrinter = new Map<number, Location>();
  const otherOptions: LocationOption[] = [];

  for (const location of locations) {
    if (location.location_type === "printer_ams" && location.printer_id !== null) {
      const current = amsByPrinter.get(location.printer_id);
      if (!current || (location.slot_index ?? 0) < (current.slot_index ?? 0)) {
        amsByPrinter.set(location.printer_id, location);
      }
    } else {
      otherOptions.push({ id: location.id, label: location.name });
    }
  }

  const amsOptions: LocationOption[] = [...amsByPrinter.entries()].map(([printerId, location]) => ({
    id: location.id,
    label: `${printers.find((p) => p.id === printerId)?.name ?? location.name} — AMS`,
  }));

  return [...amsOptions, ...otherOptions];
}

/** The single Location a Dashboard-embedded sensor-assignment control
 * should target for this printer: the lowest-slot_index AMS slot if the
 * printer has any (mirrors buildLocationOptions' AMS collapsing), else its
 * external-spool location, else null (nothing to assign a sensor to yet --
 * the printer needs a filament-system Location first). */
export function representativeLocationForPrinter(printerId: number, locations: Location[]): Location | null {
  const amsSlots = locations.filter((l) => l.printer_id === printerId && l.location_type === "printer_ams");
  if (amsSlots.length > 0) {
    return amsSlots.reduce((lowest, l) => ((l.slot_index ?? 0) < (lowest.slot_index ?? 0) ? l : lowest));
  }
  return locations.find((l) => l.printer_id === printerId && l.location_type === "printer_external_spool") ?? null;
}

/** The sensor currently covering any of this printer's own locations (AMS
 * slots or external-spool holder) -- at most one, per the one-sensor-per-
 * module invariant the backend already enforces. */
export function currentSensorForPrinter(printerId: number, locations: Location[], sensors: Sensor[]): Sensor | null {
  const printerLocationIds = new Set(locations.filter((l) => l.printer_id === printerId).map((l) => l.id));
  return sensors.find((s) => s.location_id !== null && printerLocationIds.has(s.location_id)) ?? null;
}
