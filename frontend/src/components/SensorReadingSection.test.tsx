import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensorReadingSection } from "./SensorReadingSection";
import type { Printer, SensorReadingEntry } from "@/types/api";

const PRINTER: Printer = {
  id: 5,
  name: "P1S #1",
  brand: "Bambu Lab",
  model: "P1S",
  serial_number: null,
  notes: null,
  filament_system_type: "ams",
  operational_status: "activo",
  deleted_at: null,
};

function makeEntry(overrides: Partial<SensorReadingEntry>): SensorReadingEntry {
  return {
    sensor: { id: 4, serial_number: "MOCK-0004", model: "mock", sensor_type: "mock" },
    location_id: 6,
    location: { id: 6, name: "AMS Slot 1 - P1S #1", location_type: "printer_ams", printer_id: 5 },
    timestamp: "2026-07-13T12:00:00Z",
    temperature_c: 24.0,
    relative_humidity_percent: 21.0,
    pressure_pa: 101000,
    pressure_kpa: 101.0,
    dew_point_c: -0.5,
    source: "mock",
    affected_spools: [],
    alerts: [],
    error: null,
    ...overrides,
  };
}

describe("SensorReadingSection", () => {
  it("relabels an AMS-slot reading by its printer when printers are provided", () => {
    render(<SensorReadingSection entry={makeEntry({})} printers={[PRINTER]} />);

    expect(screen.getByText("P1S #1 — AMS")).toBeInTheDocument();
    expect(screen.queryByText("AMS Slot 1 - P1S #1")).not.toBeInTheDocument();
  });

  it("shows the plain location name for a non-AMS reading", () => {
    render(
      <SensorReadingSection
        entry={makeEntry({
          location: { id: 3, name: "Storage Box A", location_type: "storage_box", printer_id: null },
        })}
        printers={[PRINTER]}
      />,
    );

    expect(screen.getByText("Storage Box A")).toBeInTheDocument();
  });

  it("falls back to the plain location name when no printers are provided", () => {
    render(<SensorReadingSection entry={makeEntry({})} />);

    expect(screen.getByText("AMS Slot 1 - P1S #1")).toBeInTheDocument();
  });
});
