import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditSensorModal } from "./EditSensorModal";
import type { SensorFormValues } from "./SensorForm";
import type { Location, Printer } from "@/types/api";

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

const STORAGE_BOX: Location = {
  id: 20,
  name: "Storage Box A",
  location_type: "storage_box",
  printer_id: null,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
  deleted_at: null,
};

const VALUE: SensorFormValues = {
  name: "Mock Sensor 1",
  model: "mock",
  serial_number: "MOCK-0001",
  sensor_type: "mock",
  port: "",
  location_id: "",
  is_active: true,
};

describe("EditSensorModal", () => {
  it("renders the form pre-filled when open", () => {
    render(
      <EditSensorModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        locations={[STORAGE_BOX]}
        printers={[PRINTER]}
      />,
    );

    expect(screen.getByText("Edit Sensor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mock Sensor 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MOCK-0001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("does not render its content when closed", () => {
    render(
      <EditSensorModal
        open={false}
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        locations={[STORAGE_BOX]}
        printers={[PRINTER]}
      />,
    );

    expect(screen.queryByText("Edit Sensor")).not.toBeInTheDocument();
  });

  it("calls onSubmit when the form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <EditSensorModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        locations={[STORAGE_BOX]}
        printers={[PRINTER]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});
