import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Printers } from "./Printers";
import { locationsApi, printersApi } from "@/api/config";
import type { Printer } from "@/types/api";

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

function renderPrinters() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(printersApi.list).mockResolvedValue([PRINTER]);
  vi.mocked(printersApi.update).mockResolvedValue(PRINTER);
  vi.mocked(locationsApi.list).mockResolvedValue([]);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Printers />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Printers", () => {
  it("renders the printer row with its filament system and status selects", async () => {
    renderPrinters();

    await screen.findByRole("link", { name: "P1S #1" });
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });

  it("updates operational_status when the status select changes", async () => {
    const user = userEvent.setup();
    renderPrinters();

    await screen.findByRole("link", { name: "P1S #1" });
    // The printer row's own selects (filament-system, status) render before
    // the create-printer/create-location forms' selects in DOM order.
    const [, statusSelect] = screen.getAllByRole("combobox");
    await user.click(statusSelect);
    await user.click(screen.getByRole("option", { name: "Mantenimiento" }));

    expect(vi.mocked(printersApi.update)).toHaveBeenCalledWith(5, { operational_status: "mantenimiento" });
  });

  it("updates filament_system_type when the filament-system select changes", async () => {
    const user = userEvent.setup();
    renderPrinters();

    await screen.findByRole("link", { name: "P1S #1" });
    const [filamentSystemSelect] = screen.getAllByRole("combobox");
    await user.click(filamentSystemSelect);
    await user.click(screen.getByRole("option", { name: "external spool" }));

    expect(vi.mocked(printersApi.update)).toHaveBeenCalledWith(5, { filament_system_type: "external_spool" });
  });
});
