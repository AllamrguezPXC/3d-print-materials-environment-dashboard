import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardFilters } from "./DashboardFilters";
import { EMPTY_DEVICE_FILTERS } from "@/lib/deviceFilters";

function renderFilters(overrides: Partial<React.ComponentProps<typeof DashboardFilters>> = {}) {
  const onChange = vi.fn();
  render(
    <DashboardFilters
      value={EMPTY_DEVICE_FILTERS}
      onChange={onChange}
      printerBrands={["Bambu Lab"]}
      filamentTypes={["PLA-derived"]}
      filamentBrands={["Generic"]}
      filamentColors={["Black"]}
      visibleCount={2}
      totalCount={2}
      {...overrides}
    />,
  );
  return { onChange };
}

describe("DashboardFilters", () => {
  it("calls onChange with the typed search value", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.type(screen.getByPlaceholderText(/search printers/i), "A");

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_DEVICE_FILTERS, search: "A" });
  });

  it("shows the visible/total result counter", () => {
    renderFilters({ visibleCount: 1, totalCount: 3 });

    expect(screen.getByText("Showing 1 of 3")).toBeInTheDocument();
  });

  it("shows an active-filter chip and clears it when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ value: { ...EMPTY_DEVICE_FILTERS, alertStatus: "critical" } });

    expect(screen.getByRole("button", { name: /remove filter: critical/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove filter: critical/i }));

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_DEVICE_FILTERS, alertStatus: "all" });
  });

  it("does not show a Clear filters button when no filters are active", () => {
    renderFilters();

    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("clears all filters when Clear filters is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ value: { ...EMPTY_DEVICE_FILTERS, search: "abc", printerBrand: "Bambu Lab" } });

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(onChange).toHaveBeenCalledWith(EMPTY_DEVICE_FILTERS);
  });
});
