import type { AlertOut, LocationInfo, Location, Printer, SensorReadingEntry } from "@/types/api";

export interface PrinterDeviceModule {
  kind: "printer";
  printer: Printer;
  amsLocations: Location[];
  externalSpoolLocations: Location[];
  sensorEntries: SensorReadingEntry[];
}

export interface StandaloneDeviceModule {
  kind: "standalone";
  location: LocationInfo;
  entries: SensorReadingEntry[];
}

export interface DeviceModulesResult {
  printerModules: PrinterDeviceModule[];
  standaloneModules: StandaloneDeviceModule[];
  unassignedEntries: SensorReadingEntry[];
}

/** Groups printers/locations/sensor readings into device-module view-models
 * for the Dashboard. Every printer always gets a module (even with zero
 * sensors/locations -- a real, unconfigured printer is not fabricated
 * data); standalone (non-printer) locations only get a module when they
 * actually have a sensor reading, since a bare Location row with nothing
 * monitoring it isn't a meaningful dashboard tile. */
export function buildDeviceModules(
  printers: Printer[],
  locations: Location[],
  sensorEntries: SensorReadingEntry[],
): DeviceModulesResult {
  const printerModules: PrinterDeviceModule[] = printers.map((printer) => ({
    kind: "printer",
    printer,
    amsLocations: locations.filter(
      (l) => l.printer_id === printer.id && l.location_type === "printer_ams",
    ),
    externalSpoolLocations: locations.filter(
      (l) => l.printer_id === printer.id && l.location_type === "printer_external_spool",
    ),
    sensorEntries: sensorEntries.filter((e) => e.location?.printer_id === printer.id),
  }));

  const standaloneEntries = sensorEntries.filter(
    (e) => e.location !== null && e.location.printer_id === null,
  );
  const byLocationId = new Map<number, SensorReadingEntry[]>();
  for (const entry of standaloneEntries) {
    const locationId = entry.location!.id;
    const existing = byLocationId.get(locationId);
    if (existing) {
      existing.push(entry);
    } else {
      byLocationId.set(locationId, [entry]);
    }
  }
  const standaloneModules: StandaloneDeviceModule[] = [...byLocationId.values()].map((entries) => ({
    kind: "standalone",
    location: entries[0].location!,
    entries,
  }));

  const unassignedEntries = sensorEntries.filter((e) => e.location === null);

  return { printerModules, standaloneModules, unassignedEntries };
}

/** Tone for one metric among an entry's active alerts -- "default" (never a
 * fabricated "ok") when no alert currently targets that metric. */
export function toneForMetric(
  alerts: AlertOut[],
  metric: AlertOut["metric"],
): "default" | "warning" | "critical" {
  const relevant = alerts.filter((a) => a.is_active && a.metric === metric);
  if (relevant.some((a) => a.severity === "critical")) return "critical";
  if (relevant.some((a) => a.severity === "warning")) return "warning";
  return "default";
}
