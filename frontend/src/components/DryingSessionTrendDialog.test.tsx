import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DryingSessionTrendDialog } from "./DryingSessionTrendDialog";
import { getReadingsHistory } from "@/api/readings";
import type { DryingSessionRead, ReadingsHistoryResponse } from "@/types/api";

vi.mock("@/api/readings");

const mockedGetReadingsHistory = vi.mocked(getReadingsHistory);

function renderDialog(session: DryingSessionRead | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DryingSessionTrendDialog session={session} onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

const SESSION: DryingSessionRead = {
  id: 1,
  spool_id: 1,
  dryer_location_id: 3,
  sensor_id: 5,
  target_temp_c: 45,
  target_duration_hours: 6,
  started_at: "2026-07-13T10:00:00Z",
  ended_at: null,
  status: "running",
  validation_notes: null,
};

describe("DryingSessionTrendDialog", () => {
  it("is closed when no session is given", () => {
    renderDialog(null);

    expect(screen.queryByText(/measured trend/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when no readings exist in the session's window", async () => {
    const empty: ReadingsHistoryResponse = { readings: [], hourly: [] };
    mockedGetReadingsHistory.mockResolvedValue(empty);

    renderDialog(SESSION);

    expect(await screen.findByText(/no readings recorded in this session/i)).toBeInTheDocument();
  });

  it("renders humidity and temperature charts when readings exist", async () => {
    const populated: ReadingsHistoryResponse = {
      readings: [],
      hourly: [
        {
          hour: "2026-07-13T10:00:00Z",
          temperature_c: 45.2,
          relative_humidity_percent: 22.1,
          pressure_pa: 101000,
          dew_point_c: 10.1,
          sample_count: 4,
        },
      ],
    };
    mockedGetReadingsHistory.mockResolvedValue(populated);

    renderDialog(SESSION);

    expect(await screen.findByText("Relative Humidity (%)")).toBeInTheDocument();
    expect(screen.getByText("Temperature (°C)")).toBeInTheDocument();
  });

  it("requests the session's own started_at..ended_at window for its sensor", async () => {
    const empty: ReadingsHistoryResponse = { readings: [], hourly: [] };
    mockedGetReadingsHistory.mockResolvedValue(empty);
    const completedSession: DryingSessionRead = {
      ...SESSION,
      ended_at: "2026-07-13T16:00:00Z",
    };

    renderDialog(completedSession);

    await screen.findByText(/no readings recorded/i);
    expect(mockedGetReadingsHistory).toHaveBeenCalledWith({
      from: "2026-07-13T10:00:00Z",
      to: "2026-07-13T16:00:00Z",
      sensorId: 5,
      aggregate: "hour",
    });
  });
});
