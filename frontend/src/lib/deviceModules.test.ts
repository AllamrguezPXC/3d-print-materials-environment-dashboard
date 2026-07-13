import { describe, expect, it } from "vitest";
import { buildDeviceModules, toneForMetric } from "./deviceModules";
import type { AlertOut, Location, Printer, SensorReadingEntry } from "@/types/api";

const PRINTER: Printer = {
  id: 1,
  name: "P1S #1",
  brand: "Bambu Lab",
  model: "P1S",
  serial_number: null,
  notes: null,
  filament_system_type: "ams",
};

const AMS_SLOT: Location = {
  id: 10,
  name: "AMS Slot 1 - P1S #1",
  location_type: "printer_ams",
  printer_id: 1,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: 0,
};

const ROOM: Location = {
  id: 20,
  name: "Primary Filament Storage Room",
  location_type: "room",
  printer_id: null,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
};

function makeEntry(overrides: Partial<SensorReadingEntry>): SensorReadingEntry {
  return {
    sensor: { id: 1, serial_number: "MOCK-0001", model: "mock", sensor_type: "mock" },
    location_id: null,
    location: null,
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

describe("buildDeviceModules", () => {
  it("produces a printer module with matching AMS locations and sensor entries", () => {
    const entry = makeEntry({
      location_id: 10,
      location: { id: 10, name: AMS_SLOT.name, location_type: "printer_ams", printer_id: 1 },
    });

    const result = buildDeviceModules([PRINTER], [AMS_SLOT], [entry]);

    expect(result.printerModules).toHaveLength(1);
    expect(result.printerModules[0].amsLocations).toEqual([AMS_SLOT]);
    expect(result.printerModules[0].externalSpoolLocations).toEqual([]);
    expect(result.printerModules[0].sensorEntries).toEqual([entry]);
  });

  it("still produces a module for a printer with zero locations and zero sensors", () => {
    const result = buildDeviceModules([PRINTER], [], []);

    expect(result.printerModules).toHaveLength(1);
    expect(result.printerModules[0].amsLocations).toEqual([]);
    expect(result.printerModules[0].sensorEntries).toEqual([]);
  });

  it("groups a non-printer location's sensor entry into a standalone module", () => {
    const entry = makeEntry({
      location_id: 20,
      location: { id: 20, name: ROOM.name, location_type: "room", printer_id: null },
    });

    const result = buildDeviceModules([], [ROOM], [entry]);

    expect(result.printerModules).toEqual([]);
    expect(result.standaloneModules).toHaveLength(1);
    expect(result.standaloneModules[0].location.name).toBe("Primary Filament Storage Room");
    expect(result.standaloneModules[0].entries).toEqual([entry]);
  });

  it("puts an entry with no location at all into unassignedEntries", () => {
    const entry = makeEntry({ location_id: null, location: null });

    const result = buildDeviceModules([], [], [entry]);

    expect(result.unassignedEntries).toEqual([entry]);
    expect(result.standaloneModules).toEqual([]);
  });
});

describe("toneForMetric", () => {
  function makeAlert(overrides: Partial<AlertOut>): AlertOut {
    return {
      id: 1,
      reading_id: 1,
      sensor_id: 1,
      location_id: 1,
      spool_id: null,
      material_profile_id: null,
      severity: "warning",
      metric: "humidity",
      message: "test",
      recommended_action: null,
      is_active: true,
      created_at: null,
      resolved_at: null,
      ...overrides,
    };
  }

  it("returns critical when a critical alert targets the metric", () => {
    const alerts = [makeAlert({ metric: "humidity", severity: "critical" })];
    expect(toneForMetric(alerts, "humidity")).toBe("critical");
  });

  it("returns warning when only a warning alert targets the metric", () => {
    const alerts = [makeAlert({ metric: "temperature", severity: "warning" })];
    expect(toneForMetric(alerts, "temperature")).toBe("warning");
  });

  it("returns default when no alert targets the metric", () => {
    const alerts = [makeAlert({ metric: "humidity", severity: "critical" })];
    expect(toneForMetric(alerts, "pressure")).toBe("default");
  });

  it("ignores resolved (inactive) alerts", () => {
    const alerts = [makeAlert({ metric: "humidity", severity: "critical", is_active: false })];
    expect(toneForMetric(alerts, "humidity")).toBe("default");
  });
});
