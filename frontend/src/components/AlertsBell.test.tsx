import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertsBell } from "./AlertsBell";
import { getCurrentReading } from "@/api/readings";
import { printersApi } from "@/api/config";
import type { AlertOut, CurrentReadingsResponse, Printer, SensorReadingEntry } from "@/types/api";

vi.mock("@/api/readings");
vi.mock("@/api/config");

const mockedGetCurrentReading = vi.mocked(getCurrentReading);
const mockedGetPrinters = vi.mocked(printersApi.list);

function makeAlert(overrides: Partial<AlertOut> = {}): AlertOut {
  return {
    id: null,
    reading_id: null,
    sensor_id: 1,
    location_id: 1,
    spool_id: 1,
    material_profile_id: 1,
    severity: "warning",
    metric: "humidity",
    message: "PLA spool #1 humidity exceeds its warning threshold.",
    recommended_action: null,
    is_active: true,
    created_at: null,
    resolved_at: null,
    ...overrides,
  };
}

function makeEntry(alerts: AlertOut[], overrides: Partial<SensorReadingEntry> = {}): SensorReadingEntry {
  return {
    sensor: { id: 1, serial_number: "MOCK-0001", model: "mock", sensor_type: "mock" },
    location_id: 1,
    location: { id: 1, name: "Room", location_type: "room", printer_id: null },
    timestamp: "2026-07-14T12:00:00Z",
    temperature_c: 24,
    relative_humidity_percent: 55,
    pressure_pa: 101000,
    pressure_kpa: 101,
    dew_point_c: 10,
    source: "mock",
    affected_spools: [],
    alerts,
    error: null,
    ...overrides,
  };
}

function renderBell() {
  mockedGetPrinters.mockResolvedValue([]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AlertsBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AlertsBell", () => {
  it("shows no count badge when there are no active alerts", async () => {
    const response: CurrentReadingsResponse = { sensors: [makeEntry([])], message: null };
    mockedGetCurrentReading.mockResolvedValue(response);

    renderBell();

    expect(await screen.findByRole("button", { name: /alerts/i })).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("shows a count badge reflecting the number of active alerts", async () => {
    const response: CurrentReadingsResponse = {
      sensors: [makeEntry([makeAlert({ severity: "critical" }), makeAlert({ severity: "warning" })])],
      message: null,
    };
    mockedGetCurrentReading.mockResolvedValue(response);

    renderBell();

    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("lists live alerts in the popover and links to /alerts history", async () => {
    const user = userEvent.setup();
    const response: CurrentReadingsResponse = {
      sensors: [makeEntry([makeAlert({ message: "Critical humidity on PLA spool #1." })])],
      message: null,
    };
    mockedGetCurrentReading.mockResolvedValue(response);

    renderBell();
    await screen.findByText("1");
    await user.click(screen.getByRole("button", { name: /alerts/i }));

    expect(screen.getByText("Critical humidity on PLA spool #1.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view alert history/i })).toHaveAttribute("href", "/alerts");
  });

  it("shows an empty state in the popover when there are no active alerts", async () => {
    const user = userEvent.setup();
    mockedGetCurrentReading.mockResolvedValue({ sensors: [makeEntry([])], message: null });

    renderBell();
    await screen.findByRole("button", { name: /alerts/i });
    await user.click(screen.getByRole("button", { name: /alerts/i }));

    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
  });

  it("shows the alert's location in the popover", async () => {
    const user = userEvent.setup();
    mockedGetCurrentReading.mockResolvedValue({
      sensors: [
        makeEntry([makeAlert()], {
          location: { id: 1, name: "Storage Box A", location_type: "storage_box", printer_id: null },
        }),
      ],
      message: null,
    });

    renderBell();
    await screen.findByText("1");
    await user.click(screen.getByRole("button", { name: /alerts/i }));

    expect(screen.getByText("Storage Box A")).toBeInTheDocument();
  });

  it("describes an AMS-slot alert by printer name, not the raw slot name", async () => {
    const user = userEvent.setup();
    const printer: Printer = {
      id: 5,
      name: "P1S #1",
      brand: "Bambu Lab",
      model: "P1S",
      serial_number: null,
      notes: null,
      filament_system_type: "ams",
      operational_status: "activo",
    };
    mockedGetPrinters.mockResolvedValue([printer]);
    mockedGetCurrentReading.mockResolvedValue({
      sensors: [
        makeEntry([makeAlert()], {
          location: { id: 9, name: "AMS Slot 1 - P1S #1", location_type: "printer_ams", printer_id: 5 },
        }),
      ],
      message: null,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AlertsBell />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText("1");
    await user.click(screen.getByRole("button", { name: /alerts/i }));

    expect(screen.getByText("P1S #1 — AMS")).toBeInTheDocument();
  });

  it("falls back to the sensor's serial number when an alert has no location", async () => {
    const user = userEvent.setup();
    mockedGetCurrentReading.mockResolvedValue({
      sensors: [makeEntry([makeAlert()], { location: null, location_id: null })],
      message: null,
    });

    renderBell();
    await screen.findByText("1");
    await user.click(screen.getByRole("button", { name: /alerts/i }));

    expect(screen.getByText("MOCK-0001")).toBeInTheDocument();
  });

  it("ignores inactive alerts when counting", async () => {
    mockedGetCurrentReading.mockResolvedValue({
      sensors: [makeEntry([makeAlert({ is_active: false })])],
      message: null,
    });

    renderBell();

    await screen.findByRole("button", { name: /alerts/i });
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
