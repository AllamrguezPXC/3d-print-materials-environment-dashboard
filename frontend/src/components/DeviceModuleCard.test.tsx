import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceModuleCard } from "./DeviceModuleCard";
import type { FilamentSpool, Location, MaterialProfile, Printer, SensorReadingEntry } from "@/types/api";

const PRINTER: Printer = {
  id: 5,
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
  printer_id: 5,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: 0,
};

const EXT_SPOOL_LOCATION: Location = {
  id: 30,
  name: "External Spool - A1 mini #2",
  location_type: "printer_external_spool",
  printer_id: 2,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
};

const MATERIAL: MaterialProfile = {
  id: 1,
  name: "PLA",
  family: "PLA-derived",
  manufacturer: null,
  variant: null,
  ideal_temp_min_c: 18,
  ideal_temp_max_c: 30,
  warning_temp_min_c: 13,
  warning_temp_max_c: 35,
  critical_temp_min_c: 8,
  critical_temp_max_c: 40,
  ideal_rh_max_percent: 40,
  warning_rh_max_percent: 50,
  critical_rh_max_percent: 60,
  drying_temp_c: 45,
  drying_time_hours_min: 4,
  drying_time_hours_max: 6,
  storage_notes: null,
  drying_notes: null,
  source_notes: null,
};

const SPOOL: FilamentSpool = { id: 1, material_profile_id: 1, brand: "Generic", color: "Black", diameter_mm: 1.75, status: "ready" };

function makeEntry(overrides: Partial<SensorReadingEntry>): SensorReadingEntry {
  return {
    sensor: { id: 4, serial_number: "MOCK-0004", model: "mock", sensor_type: "mock" },
    location_id: 10,
    location: { id: 10, name: AMS_SLOT.name, location_type: "printer_ams", printer_id: 5 },
    timestamp: "2026-07-13T12:00:00Z",
    temperature_c: 24.5,
    relative_humidity_percent: 34.3,
    pressure_pa: 101100,
    pressure_kpa: 101.1,
    dew_point_c: 7.7,
    source: "mock",
    affected_spools: [],
    alerts: [],
    error: null,
    ...overrides,
  };
}

describe("DeviceModuleCard", () => {
  it("renders printer name/brand/model and the AMS grid when amsLocations is present", () => {
    render(
      <DeviceModuleCard
        printer={PRINTER}
        amsLocations={[AMS_SLOT]}
        externalSpoolLocations={[]}
        sensorEntries={[makeEntry({})]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("P1S #1")).toBeInTheDocument();
    expect(screen.getByText("Bambu Lab P1S")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it("renders an ExternalSpoolSlot when externalSpoolLocations is present and amsLocations is empty", () => {
    render(
      <DeviceModuleCard
        printer={{ ...PRINTER, filament_system_type: "external_spool" }}
        amsLocations={[]}
        externalSpoolLocations={[EXT_SPOOL_LOCATION]}
        sensorEntries={[]}
        assignments={[{ id: 1, spool_id: 1, location_id: 30, slot_name: null, is_active: true }]}
        spools={[SPOOL]}
        materials={[MATERIAL]}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText("Ext")).toBeInTheDocument();
    expect(screen.getByText("PLA")).toBeInTheDocument();
  });

  it("shows the offline state when the sensor entry has an error, and the slot grid still renders", () => {
    render(
      <DeviceModuleCard
        printer={PRINTER}
        amsLocations={[AMS_SLOT]}
        externalSpoolLocations={[]}
        sensorEntries={[makeEntry({ error: "Sensor timed out", temperature_c: null })]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/sensor unavailable: sensor timed out/i)).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it('shows "No sensor assigned" when sensorEntries is empty', () => {
    render(
      <DeviceModuleCard
        printer={PRINTER}
        amsLocations={[AMS_SLOT]}
        externalSpoolLocations={[]}
        sensorEntries={[]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/no sensor assigned to this printer's locations/i)).toBeInTheDocument();
  });

  it('shows "No filament slots configured" when both location arrays are empty', () => {
    render(
      <DeviceModuleCard
        printer={{ ...PRINTER, filament_system_type: "storage_only" }}
        amsLocations={[]}
        externalSpoolLocations={[]}
        sensorEntries={[]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/no filament slots configured for this printer/i)).toBeInTheDocument();
  });

  it("calls onSelectSlot with the correct location when a slot is clicked", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    render(
      <DeviceModuleCard
        printer={PRINTER}
        amsLocations={[AMS_SLOT]}
        externalSpoolLocations={[]}
        sensorEntries={[]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={onSelectSlot}
      />,
    );

    await user.click(screen.getByText("A1"));

    expect(onSelectSlot).toHaveBeenCalledWith(AMS_SLOT);
  });
});
