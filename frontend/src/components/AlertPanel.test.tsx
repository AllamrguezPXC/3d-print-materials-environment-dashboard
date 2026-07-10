import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertPanel } from "./AlertPanel";
import type { AlertOut } from "@/types/api";

function makeAlert(overrides: Partial<AlertOut>): AlertOut {
  return {
    id: 1,
    reading_id: 1,
    sensor_id: 1,
    location_id: 1,
    spool_id: null,
    material_profile_id: null,
    severity: "warning",
    metric: "humidity",
    message: "Humidity is above the ideal range.",
    recommended_action: null,
    is_active: true,
    created_at: "2026-07-10T12:00:00Z",
    resolved_at: null,
    ...overrides,
  };
}

describe("AlertPanel", () => {
  it("shows an explicit empty state when there are no active alerts", () => {
    render(<AlertPanel alerts={[]} />);

    expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
  });

  it("renders a warning badge for an out-of-range humidity alert", () => {
    render(<AlertPanel alerts={[makeAlert({ severity: "warning", metric: "humidity" })]} />);

    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("humidity")).toBeInTheDocument();
    expect(screen.getByText(/humidity is above the ideal range/i)).toBeInTheDocument();
  });

  it("renders a critical badge for a critical temperature alert", () => {
    render(
      <AlertPanel
        alerts={[
          makeAlert({
            id: 2,
            severity: "critical",
            metric: "temperature",
            message: "Temperature is critically high.",
            recommended_action: "Move spool away from heat source.",
          }),
        ]}
      />,
    );

    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("temperature")).toBeInTheDocument();
    expect(screen.getByText(/temperature is critically high/i)).toBeInTheDocument();
    expect(screen.getByText(/move spool away from heat source/i)).toBeInTheDocument();
  });
});
