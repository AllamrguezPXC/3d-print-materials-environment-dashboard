import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditLocationModal } from "./EditLocationModal";
import type { LocationFormValues } from "./LocationForm";
import type { Printer } from "@/types/api";

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

const VALUE: LocationFormValues = {
  name: "Storage Box A",
  location_type: "storage_box",
  printer_id: "",
  description: "",
  max_temp_c: "",
  notes: "",
  slot_index: "",
};

describe("EditLocationModal", () => {
  it("renders the form pre-filled when open", () => {
    render(
      <EditLocationModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        printers={[PRINTER]}
      />,
    );

    expect(screen.getByText("Edit Location")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Storage Box A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("does not render its content when closed", () => {
    render(
      <EditLocationModal
        open={false}
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        printers={[PRINTER]}
      />,
    );

    expect(screen.queryByText("Edit Location")).not.toBeInTheDocument();
  });

  it("calls onSubmit when the form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <EditLocationModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        printers={[PRINTER]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders the slot index field only for AMS locations", () => {
    render(
      <EditLocationModal
        open
        onOpenChange={vi.fn()}
        value={{ ...VALUE, location_type: "printer_ams" }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        printers={[PRINTER]}
      />,
    );

    expect(screen.getByLabelText(/slot index/i)).toBeInTheDocument();
  });
});
