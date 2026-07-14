import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sensors } from "./Sensors";
import { locationsApi, printersApi, sensorsApi } from "@/api/config";
import type { Location, Printer, Sensor } from "@/types/api";

vi.mock("@/api/config");

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

const STORAGE_LOCATION: Location = {
  id: 3,
  name: "Storage Box A",
  location_type: "storage_box",
  printer_id: null,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
};

const SENSOR: Sensor = {
  id: 1,
  name: "Mock Sensor 1",
  model: "mock",
  serial_number: "MOCK-0001",
  sensor_type: "mock",
  port: null,
  is_active: true,
  location_id: null,
};

function renderSensors(sensor: Sensor = SENSOR) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(sensorsApi.list).mockResolvedValue([sensor]);
  vi.mocked(sensorsApi.update).mockResolvedValue(sensor);
  vi.mocked(locationsApi.list).mockResolvedValue([STORAGE_LOCATION]);
  vi.mocked(printersApi.list).mockResolvedValue([PRINTER]);
  return render(
    <QueryClientProvider client={queryClient}>
      <Sensors />
    </QueryClientProvider>,
  );
}

describe("Sensors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the sensor row with a location select", async () => {
    renderSensors();

    expect(await screen.findByText("MOCK-0001")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });

  it("reassigns a sensor's location when the select changes", async () => {
    const user = userEvent.setup();
    renderSensors();

    await screen.findByText("MOCK-0001");
    const [locationSelect] = screen.getAllByRole("combobox");
    await user.click(locationSelect);
    await user.click(screen.getByRole("option", { name: "Storage Box A" }));

    expect(vi.mocked(sensorsApi.update)).toHaveBeenCalledWith(1, { location_id: 3 });
  });

  it("unassigns a sensor's location when 'No location' is selected", async () => {
    const user = userEvent.setup();
    renderSensors({ ...SENSOR, location_id: 3 });

    await screen.findByText("MOCK-0001");
    const [locationSelect] = screen.getAllByRole("combobox");
    await user.click(locationSelect);
    await user.click(screen.getByRole("option", { name: "No location" }));

    expect(vi.mocked(sensorsApi.update)).toHaveBeenCalledWith(1, { location_id: null });
  });
});
