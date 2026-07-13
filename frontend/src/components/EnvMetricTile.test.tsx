import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Thermometer } from "lucide-react";
import { EnvMetricTile } from "./EnvMetricTile";

describe("EnvMetricTile", () => {
  it("renders the label and value", () => {
    render(<EnvMetricTile label="Temperature" value="23.1 °C" icon={Thermometer} />);

    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("23.1 °C")).toBeInTheDocument();
  });

  it("does not truncate the value, so long formatted values stay fully visible", () => {
    render(<EnvMetricTile label="Pressure" value="1013.27 kPa" icon={Thermometer} />);

    const value = screen.getByText("1013.27 kPa");
    expect(value.className).not.toMatch(/\btruncate\b/);
  });

  it("applies the critical tone class when tone=critical", () => {
    const { container } = render(
      <EnvMetricTile label="Humidity" value="90 %" icon={Thermometer} tone="critical" />,
    );

    expect(container.querySelector(".bg-destructive\\/15")).not.toBeNull();
  });
});
