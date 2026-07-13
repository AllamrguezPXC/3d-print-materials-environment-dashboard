import type { Location, LocationInfo, Printer } from "@/types/api";

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
