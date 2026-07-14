import { describe, expect, it } from "vitest";
import {
  buildLocationOptions,
  currentSensorForPrinter,
  describeSensorLocation,
  representativeLocationForPrinter,
} from "./sensorLocation";
import type { Location, Printer, Sensor } from "@/types/api";

const PRINTER: Printer = {
  id: 5,
  name: "P1S #1",
  brand: "Bambu Lab",
  model: "P1S",
  serial_number: null,
  notes: null,
  filament_system_type: "ams",
  operational_status: "activo",
};

function makeLocation(overrides: Partial<Location>): Location {
  return {
    id: 1,
    name: "AMS Slot 1 - P1S #1",
    location_type: "printer_ams",
    printer_id: 5,
    description: null,
    max_temp_c: null,
    notes: null,
    slot_index: 0,
    ...overrides,
  };
}

describe("describeSensorLocation", () => {
  it("relabels an AMS-slot location by its printer", () => {
    const location = makeLocation({});

    expect(describeSensorLocation(location, [PRINTER])).toBe("P1S #1 — AMS");
  });

  it("returns the plain name for a non-AMS location", () => {
    const location = makeLocation({
      name: "Storage Box A",
      location_type: "storage_box",
      printer_id: null,
      slot_index: null,
    });

    expect(describeSensorLocation(location, [PRINTER])).toBe("Storage Box A");
  });

  it("falls back to the plain name when the printer isn't found", () => {
    const location = makeLocation({ printer_id: 999 });

    expect(describeSensorLocation(location, [PRINTER])).toBe("AMS Slot 1 - P1S #1");
  });
});

describe("buildLocationOptions", () => {
  it("collapses a printer's AMS slots to one option using the lowest slot_index", () => {
    const slot0 = makeLocation({ id: 10, slot_index: 0 });
    const slot1 = makeLocation({ id: 11, name: "AMS Slot 2 - P1S #1", slot_index: 1 });

    const options = buildLocationOptions([slot1, slot0], [PRINTER]);

    expect(options).toEqual([{ id: 10, label: "P1S #1 — AMS" }]);
  });

  it("lists non-AMS locations individually, unchanged", () => {
    const storage = makeLocation({
      id: 20,
      name: "Storage Box A",
      location_type: "storage_box",
      printer_id: null,
      slot_index: null,
    });

    const options = buildLocationOptions([storage], [PRINTER]);

    expect(options).toEqual([{ id: 20, label: "Storage Box A" }]);
  });

  it("mixes collapsed AMS options with individually-listed non-AMS locations", () => {
    const slot0 = makeLocation({ id: 10, slot_index: 0 });
    const dryBox = makeLocation({
      id: 21,
      name: "Dry Box 1",
      location_type: "dry_box",
      printer_id: null,
      slot_index: null,
    });

    const options = buildLocationOptions([slot0, dryBox], [PRINTER]);

    expect(options).toEqual([
      { id: 10, label: "P1S #1 — AMS" },
      { id: 21, label: "Dry Box 1" },
    ]);
  });
});

describe("representativeLocationForPrinter", () => {
  it("returns the lowest-slot_index AMS slot when the printer has AMS slots", () => {
    const slot0 = makeLocation({ id: 10, slot_index: 0 });
    const slot1 = makeLocation({ id: 11, slot_index: 1 });

    expect(representativeLocationForPrinter(5, [slot1, slot0])).toEqual(slot0);
  });

  it("falls back to the external-spool location when there are no AMS slots", () => {
    const extSpool = makeLocation({
      id: 30,
      name: "External Spool - P1S #1",
      location_type: "printer_external_spool",
      slot_index: null,
    });

    expect(representativeLocationForPrinter(5, [extSpool])).toEqual(extSpool);
  });

  it("returns null when the printer has neither AMS slots nor an external-spool location", () => {
    const otherPrinterLocation = makeLocation({ id: 40, printer_id: 6 });

    expect(representativeLocationForPrinter(5, [otherPrinterLocation])).toBeNull();
  });
});

describe("currentSensorForPrinter", () => {
  const AMS_SLOT: Location = makeLocation({ id: 10, slot_index: 0 });

  function makeSensor(overrides: Partial<Sensor>): Sensor {
    return {
      id: 1,
      name: "Test Sensor",
      model: "mock",
      serial_number: "MOCK-0001",
      sensor_type: "mock",
      port: null,
      is_active: true,
      location_id: null,
      ...overrides,
    };
  }

  it("finds the sensor covering any of the printer's own locations", () => {
    const sensor = makeSensor({ location_id: 10 });

    expect(currentSensorForPrinter(5, [AMS_SLOT], [sensor])).toEqual(sensor);
  });

  it("returns null when no sensor covers this printer's locations", () => {
    const sensor = makeSensor({ location_id: 999 });

    expect(currentSensorForPrinter(5, [AMS_SLOT], [sensor])).toBeNull();
  });

  it("returns null when the sensor is unassigned", () => {
    const sensor = makeSensor({ location_id: null });

    expect(currentSensorForPrinter(5, [AMS_SLOT], [sensor])).toBeNull();
  });
});
