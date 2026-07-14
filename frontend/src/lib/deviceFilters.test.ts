import { describe, expect, it } from "vitest";
import { EMPTY_DEVICE_FILTERS, filterDeviceModules, type DeviceFilterContext } from "./deviceFilters";
import type { PrinterDeviceModule, StandaloneDeviceModule } from "./deviceModules";
import type { FilamentSpool, Location, MaterialProfile, Printer, SensorReadingEntry, SpoolAssignment } from "@/types/api";

const PRINTER_A: Printer = { id: 1, name: "A1 mini #1", brand: "Bambu Lab", model: "A1 mini", serial_number: null, notes: null, filament_system_type: "ams", operational_status: "activo" };
const PRINTER_B: Printer = { id: 2, name: "Other Brand #1", brand: "Other Brand", model: "X1", serial_number: null, notes: null, filament_system_type: "ams", operational_status: "activo" };

const AMS_SLOT: Location = { id: 10, name: "AMS Slot 1 - A1 mini #1", location_type: "printer_ams", printer_id: 1, description: null, max_temp_c: null, notes: null, slot_index: 0 };

const MATERIAL_PLA: MaterialProfile = {
  id: 1, name: "PLA", family: "PLA-derived", manufacturer: null, variant: null,
  ideal_temp_min_c: 18, ideal_temp_max_c: 30, warning_temp_min_c: 13, warning_temp_max_c: 35,
  critical_temp_min_c: 8, critical_temp_max_c: 40, ideal_rh_max_percent: 40, warning_rh_max_percent: 50,
  critical_rh_max_percent: 60, drying_temp_c: 45, drying_time_hours_min: 4, drying_time_hours_max: 6,
  storage_notes: null, drying_notes: null, source_notes: null,
};
const MATERIAL_PETG: MaterialProfile = { ...MATERIAL_PLA, id: 2, name: "PETG", family: "PETG-derived" };

const SPOOL_PLA: FilamentSpool = { id: 100, material_profile_id: 1, brand: "Generic", color: "Black", diameter_mm: 1.75, status: "ready" };
const SPOOL_PETG: FilamentSpool = { id: 101, material_profile_id: 2, brand: "Polymaker", color: "Orange", diameter_mm: 1.75, status: "watch" };

function makeEntry(overrides: Partial<SensorReadingEntry> = {}): SensorReadingEntry {
  return {
    sensor: { id: 1, serial_number: "MOCK-0001", model: "mock", sensor_type: "mock" },
    location_id: 10,
    location: { id: 10, name: AMS_SLOT.name, location_type: "printer_ams", printer_id: 1 },
    timestamp: "2026-07-13T12:00:00Z",
    temperature_c: 24,
    relative_humidity_percent: 30,
    pressure_pa: 101000,
    pressure_kpa: 101,
    dew_point_c: 5,
    source: "mock",
    affected_spools: [],
    alerts: [],
    error: null,
    ...overrides,
  };
}

function makePrinterModule(overrides: Partial<PrinterDeviceModule> = {}): PrinterDeviceModule {
  return {
    kind: "printer",
    printer: PRINTER_A,
    amsLocations: [AMS_SLOT],
    externalSpoolLocations: [],
    sensorEntries: [makeEntry()],
    ...overrides,
  };
}

const CTX_EMPTY: DeviceFilterContext = { spools: [], materials: [], assignments: [] };

describe("filterDeviceModules", () => {
  it("returns everything unfiltered when filters are empty", () => {
    const modules = [makePrinterModule()];
    const result = filterDeviceModules(modules, [], EMPTY_DEVICE_FILTERS, CTX_EMPTY);
    expect(result.printerModules).toHaveLength(1);
    expect(result.visibleCount).toBe(1);
    expect(result.totalCount).toBe(1);
  });

  it("filters by alert status: critical", () => {
    const critical = makePrinterModule({
      sensorEntries: [makeEntry({ alerts: [{ id: 1, reading_id: 1, sensor_id: 1, location_id: 10, spool_id: null, material_profile_id: null, severity: "critical", metric: "humidity", message: "x", recommended_action: null, is_active: true, created_at: null, resolved_at: null }] })],
    });
    const none = makePrinterModule({ printer: PRINTER_B });

    const result = filterDeviceModules([critical, none], [], { ...EMPTY_DEVICE_FILTERS, alertStatus: "critical" }, CTX_EMPTY);

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([1]);
  });

  it("filters by alert status: no_sensor", () => {
    const withSensor = makePrinterModule();
    const withoutSensor = makePrinterModule({ printer: PRINTER_B, sensorEntries: [] });

    const result = filterDeviceModules([withSensor, withoutSensor], [], { ...EMPTY_DEVICE_FILTERS, alertStatus: "no_sensor" }, CTX_EMPTY);

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("filters by sensor status: mock vs real", () => {
    const mockModule = makePrinterModule();
    const realModule = makePrinterModule({
      printer: PRINTER_B,
      sensorEntries: [makeEntry({ sensor: { id: 2, serial_number: "E25877", model: "VCP", sensor_type: "real" } })],
    });

    const result = filterDeviceModules([mockModule, realModule], [], { ...EMPTY_DEVICE_FILTERS, sensorStatus: "real" }, CTX_EMPTY);

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("filters by slot status: unconfigured excludes printers with AMS/external slots", () => {
    const withSlots = makePrinterModule();
    const withoutSlots = makePrinterModule({ printer: PRINTER_B, amsLocations: [], externalSpoolLocations: [] });

    const result = filterDeviceModules([withSlots, withoutSlots], [], { ...EMPTY_DEVICE_FILTERS, slotStatus: "unconfigured" }, CTX_EMPTY);

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("filters by slot status: empty_slots vs occupied_slots", () => {
    const module = makePrinterModule({ amsLocations: [AMS_SLOT, { ...AMS_SLOT, id: 11, slot_index: 1 }] });
    const assignments: SpoolAssignment[] = [{ id: 1, spool_id: 100, location_id: 10, slot_name: null, is_active: true }];
    const ctx: DeviceFilterContext = { spools: [SPOOL_PLA], materials: [MATERIAL_PLA], assignments };

    const empty = filterDeviceModules([module], [], { ...EMPTY_DEVICE_FILTERS, slotStatus: "empty_slots" }, ctx);
    const occupied = filterDeviceModules([module], [], { ...EMPTY_DEVICE_FILTERS, slotStatus: "occupied_slots" }, ctx);

    expect(empty.printerModules).toHaveLength(1); // slot 11 has no assignment
    expect(occupied.printerModules).toHaveLength(1); // slot 10 does
  });

  it("filters by printer brand, generated dynamically (no hardcoded model list)", () => {
    const bambu = makePrinterModule();
    const other = makePrinterModule({ printer: PRINTER_B });

    const result = filterDeviceModules([bambu, other], [], { ...EMPTY_DEVICE_FILTERS, printerBrand: "Other Brand" }, CTX_EMPTY);

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("filters by printer operational status", () => {
    const activePrinter = makePrinterModule();
    const maintenancePrinter = makePrinterModule({ printer: { ...PRINTER_B, operational_status: "mantenimiento" } });

    const result = filterDeviceModules(
      [activePrinter, maintenancePrinter],
      [],
      { ...EMPTY_DEVICE_FILTERS, printerStatus: "mantenimiento" },
      CTX_EMPTY,
    );

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("excludes standalone location modules from a specific printer-status filter", () => {
    const standalone: StandaloneDeviceModule = {
      kind: "standalone",
      location: { id: 1, name: "Storage Room", location_type: "room", printer_id: null },
      entries: [makeEntry({ location: { id: 1, name: "Storage Room", location_type: "room", printer_id: null } })],
    };

    const result = filterDeviceModules([], [standalone], { ...EMPTY_DEVICE_FILTERS, printerStatus: "activo" }, CTX_EMPTY);

    expect(result.standaloneModules).toHaveLength(0);
  });

  it("filters by filament type/brand/color/status via the module's assigned spools", () => {
    const module = makePrinterModule();
    const otherModule = makePrinterModule({ printer: PRINTER_B, amsLocations: [{ ...AMS_SLOT, id: 20 }] });
    const assignments: SpoolAssignment[] = [
      { id: 1, spool_id: 100, location_id: 10, slot_name: null, is_active: true },
      { id: 2, spool_id: 101, location_id: 20, slot_name: null, is_active: true },
    ];
    const ctx: DeviceFilterContext = { spools: [SPOOL_PLA, SPOOL_PETG], materials: [MATERIAL_PLA, MATERIAL_PETG], assignments };

    const byType = filterDeviceModules([module, otherModule], [], { ...EMPTY_DEVICE_FILTERS, filamentType: "PETG-derived" }, ctx);
    const byBrand = filterDeviceModules([module, otherModule], [], { ...EMPTY_DEVICE_FILTERS, filamentBrand: "Generic" }, ctx);
    const byColor = filterDeviceModules([module, otherModule], [], { ...EMPTY_DEVICE_FILTERS, filamentColor: "Orange" }, ctx);
    const byStatus = filterDeviceModules([module, otherModule], [], { ...EMPTY_DEVICE_FILTERS, filamentStatus: "watch" }, ctx);

    expect(byType.printerModules.map((m) => m.printer.id)).toEqual([2]);
    expect(byBrand.printerModules.map((m) => m.printer.id)).toEqual([1]);
    expect(byColor.printerModules.map((m) => m.printer.id)).toEqual([2]);
    expect(byStatus.printerModules.map((m) => m.printer.id)).toEqual([2]);
  });

  it("filters by free-text search across printer name/brand/model/sensor serial", () => {
    const module = makePrinterModule();
    const other = makePrinterModule({
      printer: PRINTER_B,
      amsLocations: [{ ...AMS_SLOT, id: 20, name: "AMS Slot 1 - Other Brand #1" }],
      sensorEntries: [makeEntry({ sensor: { id: 2, serial_number: "E25877", model: "VCP", sensor_type: "real" } })],
    });

    const bySerial = filterDeviceModules([module, other], [], { ...EMPTY_DEVICE_FILTERS, search: "e25877" }, CTX_EMPTY);
    const byName = filterDeviceModules([module, other], [], { ...EMPTY_DEVICE_FILTERS, search: "A1 mini" }, CTX_EMPTY);

    expect(bySerial.printerModules.map((m) => m.printer.id)).toEqual([2]);
    expect(byName.printerModules.map((m) => m.printer.id)).toEqual([1]);
  });

  it("excludes standalone location modules from a specific printer-brand filter", () => {
    const standalone: StandaloneDeviceModule = {
      kind: "standalone",
      location: { id: 1, name: "Storage Room", location_type: "room", printer_id: null },
      entries: [makeEntry({ location: { id: 1, name: "Storage Room", location_type: "room", printer_id: null } })],
    };

    const result = filterDeviceModules([], [standalone], { ...EMPTY_DEVICE_FILTERS, printerBrand: "Bambu Lab" }, CTX_EMPTY);

    expect(result.standaloneModules).toHaveLength(0);
  });

  it("combining two filters narrows further than either alone", () => {
    const critical = makePrinterModule({
      sensorEntries: [makeEntry({ alerts: [{ id: 1, reading_id: 1, sensor_id: 1, location_id: 10, spool_id: null, material_profile_id: null, severity: "critical", metric: "humidity", message: "x", recommended_action: null, is_active: true, created_at: null, resolved_at: null }] })],
    });
    const criticalOtherBrand = makePrinterModule({
      printer: PRINTER_B,
      sensorEntries: [makeEntry({ alerts: [{ id: 2, reading_id: 1, sensor_id: 1, location_id: 10, spool_id: null, material_profile_id: null, severity: "critical", metric: "humidity", message: "x", recommended_action: null, is_active: true, created_at: null, resolved_at: null }] })],
    });

    const result = filterDeviceModules(
      [critical, criticalOtherBrand],
      [],
      { ...EMPTY_DEVICE_FILTERS, alertStatus: "critical", printerBrand: "Bambu Lab" },
      CTX_EMPTY,
    );

    expect(result.printerModules.map((m) => m.printer.id)).toEqual([1]);
  });
});
