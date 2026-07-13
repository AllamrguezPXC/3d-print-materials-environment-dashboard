import { describe, expect, it } from "vitest";
import { describeSensorLocation } from "./sensorLocation";
import type { Location, Printer } from "@/types/api";

const PRINTER: Printer = {
  id: 5,
  name: "P1S #1",
  brand: "Bambu Lab",
  model: "P1S",
  serial_number: null,
  notes: null,
  filament_system_type: "ams",
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
