import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { History } from "./History";
import { getReadingsHistory } from "@/api/readings";
import { locationsApi, sensorsApi } from "@/api/config";

vi.mock("@/api/readings");
vi.mock("@/api/config");

const mockedGetReadingsHistory = vi.mocked(getReadingsHistory);
const mockedGetSensors = vi.mocked(sensorsApi.list);
const mockedGetLocations = vi.mocked(locationsApi.list);

function renderHistory() {
  mockedGetSensors.mockResolvedValue([]);
  mockedGetLocations.mockResolvedValue([]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <History />
    </QueryClientProvider>,
  );
}

describe("History", () => {
  it('prompts to load a range before any fetch has happened, instead of claiming "no readings"', () => {
    renderHistory();

    expect(screen.getByText(/choose a range and click "load history"/i)).toBeInTheDocument();
    expect(screen.queryByText(/no readings in this range yet/i)).not.toBeInTheDocument();
  });

  it('shows the genuine empty-range message only after "Load history" returns zero readings', async () => {
    const user = userEvent.setup();
    mockedGetReadingsHistory.mockResolvedValue({ readings: [], hourly: [] });
    renderHistory();

    await user.click(screen.getByRole("button", { name: /load history/i }));

    expect(await screen.findByText(/no readings in this range yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/choose a range and click/i)).not.toBeInTheDocument();
  });

  it("renders charts once a non-empty history is loaded", async () => {
    const user = userEvent.setup();
    mockedGetReadingsHistory.mockResolvedValue({
      readings: [],
      hourly: [
        {
          hour: "2026-07-14T12:00:00Z",
          temperature_c: 22,
          relative_humidity_percent: 40,
          pressure_pa: 101000,
          dew_point_c: 8,
          sample_count: 3,
        },
      ],
    });
    renderHistory();

    await user.click(screen.getByRole("button", { name: /load history/i }));

    expect(await screen.findByText("Temperature (°C)")).toBeInTheDocument();
    expect(screen.queryByText(/no readings in this range yet/i)).not.toBeInTheDocument();
  });
});
