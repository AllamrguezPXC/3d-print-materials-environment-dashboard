import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Alerts } from "./Alerts";
import { alertsApi, locationsApi } from "@/api/config";
import type { AlertOut, Location } from "@/types/api";

vi.mock("@/api/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/config")>();
  return {
    ...actual,
    alertsApi: { list: vi.fn(), resolve: vi.fn() },
    locationsApi: { ...actual.locationsApi, list: vi.fn() },
  };
});

const mockedList = vi.mocked(alertsApi.list);
const mockedResolve = vi.mocked(alertsApi.resolve);
const mockedLocationsList = vi.mocked(locationsApi.list);

function renderAlerts() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Alerts />
    </QueryClientProvider>,
  );
}

const LOCATION: Location = {
  id: 1,
  name: "AMS Slot 1 - A1 mini #1",
  location_type: "printer_ams",
  printer_id: 1,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: 0,
  deleted_at: null,
};

const ACTIVE_ALERT: AlertOut = {
  id: 1,
  reading_id: 1,
  sensor_id: 1,
  location_id: 1,
  spool_id: 1,
  material_profile_id: 1,
  severity: "critical",
  metric: "humidity",
  message: "Humidity is critically high for PLA.",
  recommended_action: "Move spool to a dry box.",
  is_active: true,
  created_at: "2026-07-13T12:00:00Z",
  resolved_at: null,
};

describe("Alerts", () => {
  it("shows an empty state when there are no alerts", async () => {
    mockedList.mockResolvedValue([]);
    mockedLocationsList.mockResolvedValue([]);

    renderAlerts();

    expect(await screen.findByText(/no alerts match the current filters/i)).toBeInTheDocument();
  });

  it("renders an active alert with its severity, location, and a Resolve button", async () => {
    mockedList.mockResolvedValue([ACTIVE_ALERT]);
    mockedLocationsList.mockResolvedValue([LOCATION]);

    renderAlerts();

    expect(await screen.findByText(/humidity is critically high for pla/i)).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("AMS Slot 1 - A1 mini #1")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resolve/i })).toBeInTheDocument();
  });

  it("resolving an alert calls the API and refreshes the list", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValueOnce([ACTIVE_ALERT]);
    mockedLocationsList.mockResolvedValue([LOCATION]);
    mockedResolve.mockResolvedValue({ alert: { ...ACTIVE_ALERT, is_active: false, resolved_at: "2026-07-13T12:05:00Z" } });
    mockedList.mockResolvedValueOnce([
      { ...ACTIVE_ALERT, is_active: false, resolved_at: "2026-07-13T12:05:00Z" },
    ]);

    renderAlerts();

    await user.click(await screen.findByRole("button", { name: /resolve/i }));

    expect(mockedResolve).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText("Resolved")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /resolve/i })).not.toBeInTheDocument();
  });

  it("does not show a Resolve button for an already-resolved alert", async () => {
    mockedList.mockResolvedValue([{ ...ACTIVE_ALERT, is_active: false, resolved_at: "2026-07-13T12:05:00Z" }]);
    mockedLocationsList.mockResolvedValue([LOCATION]);

    renderAlerts();

    expect(await screen.findByText("Resolved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resolve/i })).not.toBeInTheDocument();
  });
});
