import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./Dashboard";
import { getCurrentReading } from "@/api/readings";
import { dryingApi } from "@/api/config";
import type { CurrentReadingsResponse, SensorReadingEntry } from "@/types/api";

vi.mock("@/api/readings");
vi.mock("@/api/config");

const mockedGetCurrentReading = vi.mocked(getCurrentReading);
const mockedGetRecommendations = vi.mocked(dryingApi.recommendations);

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

const SENSOR_ENTRY: SensorReadingEntry = {
  sensor: { id: 1, serial_number: "MOCK-0001", model: "VCP-PTH450-CAL", sensor_type: "mock" },
  location_id: 1,
  location: { id: 1, name: "Primary Filament Storage Room", location_type: "room", printer_id: null },
  timestamp: "2026-07-10T12:00:00Z",
  temperature_c: 23.1,
  relative_humidity_percent: 21.2,
  pressure_pa: 100700,
  pressure_kpa: 100.7,
  dew_point_c: -0.3,
  source: "mock",
  affected_spools: [],
  alerts: [],
  error: null,
};

describe("Dashboard", () => {
  it("shows a loading state before data resolves", () => {
    mockedGetCurrentReading.mockReturnValue(new Promise(() => {}));
    mockedGetRecommendations.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByText(/loading current reading/i)).toBeInTheDocument();
  });

  it("shows a friendly error when the backend is unreachable", async () => {
    mockedGetCurrentReading.mockRejectedValue(new Error("Failed to fetch"));
    mockedGetRecommendations.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText(/could not reach the backend/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it("shows an explicit empty state when no sensors are active", async () => {
    const response: CurrentReadingsResponse = { sensors: [], message: "No active sensors configured." };
    mockedGetCurrentReading.mockResolvedValue(response);
    mockedGetRecommendations.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText("No active sensors configured.")).toBeInTheDocument();
    expect(screen.getByText(/no spools currently need drying/i)).toBeInTheDocument();
  });

  it("renders sensor readings and drying recommendations when both are present", async () => {
    const response: CurrentReadingsResponse = { sensors: [SENSOR_ENTRY], message: null };
    mockedGetCurrentReading.mockResolvedValue(response);
    mockedGetRecommendations.mockResolvedValue([
      {
        spool_id: 5,
        material_profile_name: "PETG",
        current_status: "warning",
        drying_temp_c: 65,
        drying_time_hours_min: 4,
        drying_time_hours_max: 6,
        dryer_location_id: null,
        dryer_capability_ok: null,
        dryer_max_temp_c: null,
        message: "Humidity is above the ideal range for PETG.",
      },
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText("MOCK-0001")).toBeInTheDocument());
    expect(screen.getByText("23.1 °C")).toBeInTheDocument();
    expect(screen.getByText("21.2 %")).toBeInTheDocument();
    expect(screen.getByText(/humidity is above the ideal range for petg/i)).toBeInTheDocument();
  });
});
