import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SensorForm, type SensorFormValues } from "./SensorForm";
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

const AMS_SLOTS: Location[] = [0, 1, 2, 3].map((slot_index) => ({
  id: 10 + slot_index,
  name: `AMS Slot ${slot_index + 1} - P1S #1`,
  location_type: "printer_ams",
  printer_id: 5,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index,
}));

const STORAGE_BOX: Location = {
  id: 20,
  name: "Storage Box A",
  location_type: "storage_box",
  printer_id: null,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
};

const LOCATIONS = [...AMS_SLOTS, STORAGE_BOX];

const EMPTY_VALUE: SensorFormValues = {
  name: "",
  model: "",
  serial_number: "",
  sensor_type: "mock",
  port: "",
  location_id: "",
};

describe("SensorForm location picker", () => {
  it("collapses an AMS module's slots to a single option", async () => {
    const user = userEvent.setup();
    render(
      <SensorForm
        value={EMPTY_VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        locations={LOCATIONS}
        printers={[PRINTER]}
      />,
    );

    await user.click(screen.getAllByRole("combobox")[1]);

    expect(screen.getByRole("option", { name: "P1S #1 — AMS" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /AMS Slot 2/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /AMS Slot 3/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /AMS Slot 4/i })).not.toBeInTheDocument();
  });

  it("lists non-AMS locations individually", async () => {
    const user = userEvent.setup();
    render(
      <SensorForm
        value={EMPTY_VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        locations={LOCATIONS}
        printers={[PRINTER]}
      />,
    );

    await user.click(screen.getAllByRole("combobox")[1]);

    expect(screen.getByRole("option", { name: "Storage Box A" })).toBeInTheDocument();
  });

  it("assigns the AMS option's lowest slot_index as the location_id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SensorForm
        value={EMPTY_VALUE}
        onChange={onChange}
        onSubmit={vi.fn()}
        locations={LOCATIONS}
        printers={[PRINTER]}
      />,
    );

    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "P1S #1 — AMS" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ location_id: "10" }));
  });
});
