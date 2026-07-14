import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SensorAssignmentModal } from "./SensorAssignmentModal";
import { sensorsApi } from "@/api/config";
import type { Location, Printer, Sensor } from "@/types/api";

vi.mock("@/api/config");

const mockedCreateSensor = vi.mocked(sensorsApi.create);
const mockedGetPorts = vi.mocked(sensorsApi.ports);

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

const ASSIGNED_SENSOR: Sensor = {
  id: 1,
  name: "Mock Sensor 1",
  model: "mock",
  serial_number: "MOCK-0001",
  sensor_type: "mock",
  port: null,
  is_active: true,
  location_id: 10,
};

const UNASSIGNED_SENSOR: Sensor = {
  id: 2,
  name: "Mock Sensor 2",
  model: "mock",
  serial_number: "MOCK-0002",
  sensor_type: "mock",
  port: null,
  is_active: true,
  location_id: null,
};

function renderModal(overrides: Partial<React.ComponentProps<typeof SensorAssignmentModal>> = {}) {
  mockedGetPorts.mockResolvedValue([]);
  const onSelectedSensorIdChange = vi.fn();
  const onAssign = vi.fn();
  const onUnassign = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SensorAssignmentModal
        printer={PRINTER}
        targetLocation={AMS_SLOT}
        open
        onOpenChange={vi.fn()}
        currentSensor={null}
        candidateSensors={[UNASSIGNED_SENSOR]}
        locations={[AMS_SLOT]}
        printers={[PRINTER]}
        selectedSensorId=""
        onSelectedSensorIdChange={onSelectedSensorIdChange}
        onAssign={onAssign}
        onUnassign={onUnassign}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onSelectedSensorIdChange, onAssign, onUnassign };
}

describe("SensorAssignmentModal", () => {
  it("shows the empty state when no sensor is currently assigned", () => {
    renderModal();

    expect(screen.getByText(/no sensor is currently assigned/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unassign/i })).not.toBeInTheDocument();
  });

  it("shows the current sensor with an Unassign action when one is assigned", async () => {
    const user = userEvent.setup();
    const { onUnassign } = renderModal({ currentSensor: ASSIGNED_SENSOR, candidateSensors: [] });

    expect(screen.getByText("MOCK-0001")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /unassign/i }));

    expect(onUnassign).toHaveBeenCalled();
  });

  it("lists candidate sensors and calls onAssign with the selected one", async () => {
    const user = userEvent.setup();
    const { onAssign } = renderModal({ selectedSensorId: "2" });

    await user.click(screen.getByRole("button", { name: "Assign" }));

    expect(onAssign).toHaveBeenCalled();
  });

  it("disables Assign until a sensor is selected", () => {
    renderModal({ selectedSensorId: "" });

    expect(screen.getByRole("button", { name: "Assign" })).toBeDisabled();
  });

  it("shows an empty state when there are no candidate sensors", () => {
    renderModal({ candidateSensors: [] });

    expect(screen.getByText(/no other sensors available/i)).toBeInTheDocument();
  });

  it("shows a guidance message when the printer has no target location", () => {
    renderModal({ targetLocation: null });

    expect(screen.getByText(/switch its filament system type first/i)).toBeInTheDocument();
  });

  it("creates and assigns a new sensor directly to the target location", async () => {
    const user = userEvent.setup();
    mockedCreateSensor.mockResolvedValue({
      id: 3,
      name: "New Sensor",
      model: "mock",
      serial_number: "MOCK-0003",
      sensor_type: "mock",
      port: null,
      is_active: true,
      location_id: 10,
    });

    renderModal();
    await user.click(screen.getByRole("button", { name: /\+ create new sensor/i }));
    await user.type(screen.getByLabelText("Name"), "New Sensor");
    await user.type(screen.getByLabelText("Serial number"), "MOCK-0003");
    await user.click(screen.getByRole("button", { name: /create & assign/i }));

    expect(mockedCreateSensor).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Sensor", serial_number: "MOCK-0003", location_id: 10 }),
    );
  });

  it("disables creating a new sensor while one is already assigned", () => {
    renderModal({ currentSensor: ASSIGNED_SENSOR, candidateSensors: [] });

    expect(screen.getByRole("button", { name: /\+ create new sensor/i })).toBeDisabled();
    expect(screen.getByText(/unassign the current sensor before creating/i)).toBeInTheDocument();
  });
});
