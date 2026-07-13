import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandaloneLocationCard } from "./StandaloneLocationCard";
import type { LocationInfo, SensorReadingEntry } from "@/types/api";

const ROOM: LocationInfo = {
  id: 1,
  name: "Primary Filament Storage Room",
  location_type: "room",
  printer_id: null,
};

function makeEntry(overrides: Partial<SensorReadingEntry>): SensorReadingEntry {
  return {
    sensor: { id: 1, serial_number: "E25877", model: "VCP-PTH450-CAL", sensor_type: "real" },
    location_id: 1,
    location: ROOM,
    timestamp: "2026-07-13T12:00:00Z",
    temperature_c: 23.1,
    relative_humidity_percent: 21.2,
    pressure_pa: 100700,
    pressure_kpa: 100.7,
    dew_point_c: -0.3,
    source: "real",
    affected_spools: [],
    alerts: [],
    error: null,
    ...overrides,
  };
}

describe("StandaloneLocationCard", () => {
  it("renders the location name, type icon, and metric tiles", () => {
    render(<StandaloneLocationCard location={ROOM} entries={[makeEntry({})]} />);

    expect(screen.getByText("Primary Filament Storage Room")).toBeInTheDocument();
    expect(screen.getByText("Room")).toBeInTheDocument();
    expect(screen.getByText("23.10 °C")).toBeInTheDocument();
    expect(screen.getByText("21.20 %")).toBeInTheDocument();
  });

  it("renders active alerts for the location", () => {
    render(
      <StandaloneLocationCard
        location={ROOM}
        entries={[
          makeEntry({
            alerts: [
              {
                id: 1,
                reading_id: 1,
                sensor_id: 1,
                location_id: 1,
                spool_id: 1,
                material_profile_id: 1,
                severity: "critical",
                metric: "humidity",
                message: "PLA spool #1 humidity exceeds its critical threshold.",
                recommended_action: null,
                is_active: true,
                created_at: null,
                resolved_at: null,
              },
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText(/humidity exceeds its critical threshold/i)).toBeInTheDocument();
  });
});
