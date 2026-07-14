import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeviceModuleCard } from "./DeviceModuleCard";
import { printersApi } from "@/api/config";
import type { FilamentSpool, Location, MaterialProfile, Printer, SensorReadingEntry } from "@/types/api";

vi.mock("@/api/config", async () => {
  const actual = await vi.importActual<typeof import("@/api/config")>("@/api/config");
  return { ...actual, printersApi: { ...actual.printersApi, update: vi.fn().mockResolvedValue({}) } };
});

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

function renderCard(overrides: Partial<React.ComponentProps<typeof DeviceModuleCard>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelectSlot = vi.fn();
  const onAssignSensor = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <DeviceModuleCard
        printer={PRINTER}
        amsLocations={[AMS_SLOT]}
        externalSpoolLocations={[]}
        sensorEntries={[]}
        assignments={[]}
        spools={[]}
        materials={[]}
        onSelectSlot={onSelectSlot}
        onAssignSensor={onAssignSensor}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onSelectSlot, onAssignSensor };
}

describe("DeviceModuleCard", () => {
  it("renders printer name/brand/model and the AMS grid when amsLocations is present", () => {
    renderCard({ sensorEntries: [makeEntry({})] });

    expect(screen.getByText("P1S #1")).toBeInTheDocument();
    expect(screen.getByText("Bambu Lab P1S")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it("renders an ExternalSpoolSlot when externalSpoolLocations is present and amsLocations is empty", () => {
    renderCard({
      printer: { ...PRINTER, filament_system_type: "external_spool" },
      amsLocations: [],
      externalSpoolLocations: [EXT_SPOOL_LOCATION],
      assignments: [{ id: 1, spool_id: 1, location_id: 30, slot_name: null, is_active: true }],
      spools: [SPOOL],
      materials: [MATERIAL],
    });

    expect(screen.getByText("Ext")).toBeInTheDocument();
    expect(screen.getByText("PLA")).toBeInTheDocument();
  });

  it("shows the offline state when the sensor entry has an error, and the slot grid still renders", () => {
    renderCard({ sensorEntries: [makeEntry({ error: "Sensor timed out", temperature_c: null })] });

    expect(screen.getByText(/sensor unavailable: sensor timed out/i)).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it('shows "No sensor assigned" and an assign button when sensorEntries is empty', () => {
    renderCard();

    expect(screen.getByText(/no sensor assigned to this printer's locations/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assign sensor/i })).toBeInTheDocument();
  });

  it("calls onAssignSensor when the assign-sensor button is clicked", async () => {
    const user = userEvent.setup();
    const { onAssignSensor } = renderCard();

    await user.click(screen.getByRole("button", { name: /assign sensor/i }));

    expect(onAssignSensor).toHaveBeenCalledWith(PRINTER);
  });

  it("calls onAssignSensor when Change is clicked for an already-assigned sensor", async () => {
    const user = userEvent.setup();
    const { onAssignSensor } = renderCard({ sensorEntries: [makeEntry({})] });

    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(onAssignSensor).toHaveBeenCalledWith(PRINTER);
  });

  it("renders both the AMS grid and the external-spool slot when a printer has both location kinds (e.g. after switching types, or ams_external_spool)", () => {
    renderCard({
      printer: { ...PRINTER, filament_system_type: "ams_external_spool" },
      amsLocations: [AMS_SLOT],
      externalSpoolLocations: [EXT_SPOOL_LOCATION],
      assignments: [{ id: 1, spool_id: 1, location_id: 30, slot_name: null, is_active: true }],
      spools: [SPOOL],
      materials: [MATERIAL],
    });

    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("Ext")).toBeInTheDocument();
  });

  it('shows "No filament slots configured" when both location arrays are empty', () => {
    renderCard({ printer: { ...PRINTER, filament_system_type: "storage_only" }, amsLocations: [] });

    expect(screen.getByText(/no filament slots configured for this printer/i)).toBeInTheDocument();
  });

  it("calls onSelectSlot with the correct location when a slot is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectSlot } = renderCard();

    await user.click(screen.getByText("A1"));

    expect(onSelectSlot).toHaveBeenCalledWith(AMS_SLOT);
  });

  it("dims the card when operational_status is not activo", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DeviceModuleCard
          printer={{ ...PRINTER, operational_status: "mantenimiento" }}
          amsLocations={[AMS_SLOT]}
          externalSpoolLocations={[]}
          sensorEntries={[]}
          assignments={[]}
          spools={[]}
          materials={[]}
          onSelectSlot={vi.fn()}
          onAssignSensor={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(container.querySelector(".opacity-60")).not.toBeNull();
  });

  it("does not dim the card when operational_status is activo", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DeviceModuleCard
          printer={PRINTER}
          amsLocations={[AMS_SLOT]}
          externalSpoolLocations={[]}
          sensorEntries={[]}
          assignments={[]}
          spools={[]}
          materials={[]}
          onSelectSlot={vi.fn()}
          onAssignSensor={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(container.querySelector(".opacity-60")).toBeNull();
  });

  it("hides the AMS/External Spool toggle when filament_system_type is storage_only", () => {
    renderCard({ printer: { ...PRINTER, filament_system_type: "storage_only" }, amsLocations: [] });

    // Only the operational-status select renders; the filament-system-type
    // toggle is hidden for a type it can't represent (2-value toggle).
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("shows the AMS/External Spool toggle when filament_system_type is ams", () => {
    renderCard();

    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("calls useUpdatePrinter when the operational-status select changes", async () => {
    const user = userEvent.setup();
    renderCard();

    const comboboxes = screen.getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(screen.getByRole("option", { name: "Mantenimiento" }));

    expect(vi.mocked(printersApi.update)).toHaveBeenCalledWith(5, { operational_status: "mantenimiento" });
  });
});
