import { describe, expect, it } from "vitest";
import {
  formatDewPoint,
  formatEnvironmentalValue,
  formatHumidity,
  formatPressure,
  formatTemperature,
} from "./format";

describe("formatEnvironmentalValue", () => {
  it("formats with exactly 2 decimals and the given unit", () => {
    expect(formatEnvironmentalValue(31.2, "°C")).toBe("31.20 °C");
    expect(formatEnvironmentalValue(19.034, "%")).toBe("19.03 %");
  });

  it("renders an explicit dash for null/undefined instead of fabricating 0.00", () => {
    expect(formatEnvironmentalValue(null, "°C")).toBe("—");
    expect(formatEnvironmentalValue(undefined, "°C")).toBe("—");
  });

  it("renders a dash for NaN", () => {
    expect(formatEnvironmentalValue(Number.NaN, "°C")).toBe("—");
  });

  it("rounds to 2 decimals rather than truncating", () => {
    expect(formatEnvironmentalValue(1013.267, "kPa")).toBe("1013.27 kPa");
  });
});

describe("unit-specific formatters", () => {
  it("formatTemperature appends °C", () => {
    expect(formatTemperature(24)).toBe("24.00 °C");
  });

  it("formatHumidity appends %", () => {
    expect(formatHumidity(38.456)).toBe("38.46 %");
  });

  it("formatPressure appends kPa", () => {
    expect(formatPressure(98.1)).toBe("98.10 kPa");
  });

  it("formatDewPoint appends °C", () => {
    expect(formatDewPoint(5.3)).toBe("5.30 °C");
  });
});
