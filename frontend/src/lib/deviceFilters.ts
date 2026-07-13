import type { PrinterDeviceModule, StandaloneDeviceModule } from "@/lib/deviceModules";
import type { FilamentSpool, MaterialProfile, SensorReadingEntry, SpoolAssignment } from "@/types/api";

export const ALL = "all";

export type AlertStatusFilter = "all" | "none" | "warning" | "critical" | "offline" | "no_sensor";
export type SensorStatusFilter = "all" | "active" | "unassigned" | "mock" | "real";
export type SlotStatusFilter = "all" | "configured" | "unconfigured" | "empty_slots" | "occupied_slots";

export interface DeviceFiltersValue {
  search: string;
  alertStatus: AlertStatusFilter;
  sensorStatus: SensorStatusFilter;
  slotStatus: SlotStatusFilter;
  printerBrand: string;
  filamentType: string;
  filamentBrand: string;
  filamentColor: string;
  filamentStatus: string;
}

export const EMPTY_DEVICE_FILTERS: DeviceFiltersValue = {
  search: "",
  alertStatus: ALL,
  sensorStatus: ALL,
  slotStatus: ALL,
  printerBrand: ALL,
  filamentType: ALL,
  filamentBrand: ALL,
  filamentColor: ALL,
  filamentStatus: ALL,
};

export interface DeviceFilterContext {
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  assignments: SpoolAssignment[];
}

function primaryEntry(entries: SensorReadingEntry[]): SensorReadingEntry | null {
  return entries.length > 0 ? entries[0] : null;
}

/** Same accent-tier logic DeviceModuleCard/StandaloneLocationCard already
 * compute locally (a sensor read error, or any active critical alert, wins
 * over a mere warning) -- exposed here so the filter bar can classify a
 * module by the same criteria the card itself displays. */
function alertTier(entries: SensorReadingEntry[]): "critical" | "warning" | "none" {
  const entry = primaryEntry(entries);
  const alerts = entries.flatMap((e) => e.alerts);
  const hasCritical = entry?.error != null || alerts.some((a) => a.is_active && a.severity === "critical");
  const hasWarning = alerts.some((a) => a.is_active && a.severity === "warning");
  if (hasCritical) return "critical";
  if (hasWarning) return "warning";
  return "none";
}

function matchesAlertStatus(entries: SensorReadingEntry[], filter: AlertStatusFilter): boolean {
  if (filter === ALL) return true;
  const entry = primaryEntry(entries);
  if (filter === "no_sensor") return entry === null;
  if (filter === "offline") return entry?.error != null;
  return alertTier(entries) === filter;
}

function matchesSensorStatus(entries: SensorReadingEntry[], filter: SensorStatusFilter): boolean {
  if (filter === ALL) return true;
  const entry = primaryEntry(entries);
  if (filter === "unassigned") return entry === null;
  if (filter === "active") return entry !== null && entry.error == null;
  if (filter === "mock") return entry?.sensor.sensor_type === "mock";
  if (filter === "real") return entry?.sensor.sensor_type === "real";
  return true;
}

function moduleLocationIds(module: PrinterDeviceModule | StandaloneDeviceModule): number[] {
  return module.kind === "printer"
    ? [...module.amsLocations, ...module.externalSpoolLocations].map((l) => l.id)
    : [module.location.id];
}

function spoolsInModule(
  module: PrinterDeviceModule | StandaloneDeviceModule,
  ctx: DeviceFilterContext,
): FilamentSpool[] {
  const locationIds = new Set(moduleLocationIds(module));
  const spoolIds = new Set(
    ctx.assignments.filter((a) => a.is_active && locationIds.has(a.location_id)).map((a) => a.spool_id),
  );
  return ctx.spools.filter((s) => spoolIds.has(s.id));
}

function matchesFilament(
  module: PrinterDeviceModule | StandaloneDeviceModule,
  filters: DeviceFiltersValue,
  ctx: DeviceFilterContext,
): boolean {
  if (
    filters.filamentType === ALL &&
    filters.filamentBrand === ALL &&
    filters.filamentColor === ALL &&
    filters.filamentStatus === ALL
  ) {
    return true;
  }
  const spools = spoolsInModule(module, ctx);
  return spools.some((s) => {
    const material = ctx.materials.find((m) => m.id === s.material_profile_id);
    if (filters.filamentType !== ALL && material?.family !== filters.filamentType) return false;
    if (filters.filamentBrand !== ALL && s.brand !== filters.filamentBrand) return false;
    if (filters.filamentColor !== ALL && s.color !== filters.filamentColor) return false;
    if (filters.filamentStatus !== ALL && s.status !== filters.filamentStatus) return false;
    return true;
  });
}

function matchesSlotStatus(module: PrinterDeviceModule | StandaloneDeviceModule, filter: SlotStatusFilter): boolean {
  if (filter === ALL) return true;
  // Standalone (room/storage_box/dry_box/dryer) locations are never sliced
  // into filament slots -- any specific slot criterion excludes them.
  if (module.kind !== "printer") return false;
  const slotLocations = [...module.amsLocations, ...module.externalSpoolLocations];
  if (filter === "configured") return slotLocations.length > 0;
  if (filter === "unconfigured") return slotLocations.length === 0;
  return slotLocations.length > 0;
}

function matchesSlotOccupancy(
  module: PrinterDeviceModule,
  filter: SlotStatusFilter,
  ctx: DeviceFilterContext,
): boolean {
  if (filter !== "empty_slots" && filter !== "occupied_slots") return true;
  const slotLocations = [...module.amsLocations, ...module.externalSpoolLocations];
  if (slotLocations.length === 0) return false;
  const occupiedLocationIds = new Set(
    ctx.assignments.filter((a) => a.is_active).map((a) => a.location_id),
  );
  const hasEmpty = slotLocations.some((l) => !occupiedLocationIds.has(l.id));
  const hasOccupied = slotLocations.some((l) => occupiedLocationIds.has(l.id));
  return filter === "empty_slots" ? hasEmpty : hasOccupied;
}

function matchesPrinterBrand(module: PrinterDeviceModule | StandaloneDeviceModule, brand: string): boolean {
  if (brand === ALL) return true;
  // A standalone location has no printer, so a specific brand filter never
  // matches it -- that's correct, not a bug: filtering by printer brand is
  // meaningless for a room/storage box.
  return module.kind === "printer" && module.printer.brand === brand;
}

function moduleSearchHaystack(module: PrinterDeviceModule | StandaloneDeviceModule, ctx: DeviceFilterContext): string {
  const parts: string[] = [];
  if (module.kind === "printer") {
    parts.push(module.printer.name, module.printer.brand, module.printer.model);
    parts.push(...module.amsLocations.map((l) => l.name), ...module.externalSpoolLocations.map((l) => l.name));
    parts.push(...module.sensorEntries.map((e) => e.sensor.serial_number));
  } else {
    parts.push(module.location.name);
    parts.push(...module.entries.map((e) => e.sensor.serial_number));
  }
  for (const spool of spoolsInModule(module, ctx)) {
    parts.push(spool.brand);
    if (spool.color) parts.push(spool.color);
  }
  return parts.join(" ").toLowerCase();
}

function matchesSearch(module: PrinterDeviceModule | StandaloneDeviceModule, search: string, ctx: DeviceFilterContext): boolean {
  const trimmed = search.trim().toLowerCase();
  if (!trimmed) return true;
  return moduleSearchHaystack(module, ctx).includes(trimmed);
}

export interface FilteredDeviceModules {
  printerModules: PrinterDeviceModule[];
  standaloneModules: StandaloneDeviceModule[];
  totalCount: number;
  visibleCount: number;
}

/** Applies every Dashboard filter criterion client-side over the modules
 * `buildDeviceModules()` already built -- never fetches anything new, same
 * principle FilamentFilters.tsx/Spools.tsx already use. */
export function filterDeviceModules(
  printerModules: PrinterDeviceModule[],
  standaloneModules: StandaloneDeviceModule[],
  filters: DeviceFiltersValue,
  ctx: DeviceFilterContext,
): FilteredDeviceModules {
  const totalCount = printerModules.length + standaloneModules.length;

  const filteredPrinterModules = printerModules.filter(
    (module) =>
      matchesSearch(module, filters.search, ctx) &&
      matchesAlertStatus(module.sensorEntries, filters.alertStatus) &&
      matchesSensorStatus(module.sensorEntries, filters.sensorStatus) &&
      matchesSlotStatus(module, filters.slotStatus) &&
      matchesSlotOccupancy(module, filters.slotStatus, ctx) &&
      matchesPrinterBrand(module, filters.printerBrand) &&
      matchesFilament(module, filters, ctx),
  );

  const filteredStandaloneModules = standaloneModules.filter(
    (module) =>
      matchesSearch(module, filters.search, ctx) &&
      matchesAlertStatus(module.entries, filters.alertStatus) &&
      matchesSensorStatus(module.entries, filters.sensorStatus) &&
      matchesSlotStatus(module, filters.slotStatus) &&
      matchesPrinterBrand(module, filters.printerBrand) &&
      matchesFilament(module, filters, ctx),
  );

  return {
    printerModules: filteredPrinterModules,
    standaloneModules: filteredStandaloneModules,
    totalCount,
    visibleCount: filteredPrinterModules.length + filteredStandaloneModules.length,
  };
}
