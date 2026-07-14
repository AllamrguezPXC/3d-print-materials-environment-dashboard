import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { DEVICE_FILTERS_STORAGE_KEY } from "@/hooks/useDeviceFilters";
import { EMPTY_DEVICE_FILTERS } from "@/lib/deviceFilters";

beforeEach(() => {
  localStorage.clear();
});

describe("Settings", () => {
  it("removes the persisted device filters when Reset filters is clicked", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DEVICE_FILTERS_STORAGE_KEY,
      JSON.stringify({ ...EMPTY_DEVICE_FILTERS, search: "PLA" }),
    );

    render(<Settings />);
    await user.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(localStorage.getItem(DEVICE_FILTERS_STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/filters reset/i)).toBeInTheDocument();
  });
});
