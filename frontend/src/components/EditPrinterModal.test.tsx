import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditPrinterModal } from "./EditPrinterModal";
import type { PrinterFormValues } from "./PrinterForm";

const VALUE: PrinterFormValues = {
  name: "A1 mini #5",
  brand: "Bambu Lab",
  model: "A1 mini",
  filament_system_type: "ams",
  serial_number: "E25877",
  notes: "",
};

describe("EditPrinterModal", () => {
  it("renders the form pre-filled when open", () => {
    render(
      <EditPrinterModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Edit Printer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A1 mini #5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("E25877")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("does not render its content when closed", () => {
    render(
      <EditPrinterModal
        open={false}
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText("Edit Printer")).not.toBeInTheDocument();
  });

  it("calls onSubmit when the form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <EditPrinterModal
        open
        onOpenChange={vi.fn()}
        value={VALUE}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalled();
  });
});
