import { describe, expect, it } from "vitest";
import {
  isPrinterDimmed,
  PRINTER_OPERATIONAL_STATUSES,
  printerStatusBadgeClassName,
  printerStatusLabel,
} from "./printerStatus";

describe("printerStatusLabel", () => {
  it.each(PRINTER_OPERATIONAL_STATUSES)("has a label for %s", (status) => {
    expect(printerStatusLabel(status).length).toBeGreaterThan(0);
  });

  it("falls back to the raw string for an unrecognized status", () => {
    expect(printerStatusLabel("unknown_value")).toBe("unknown_value");
  });
});

describe("printerStatusBadgeClassName", () => {
  it("gives activo an ok tone, inactivo a destructive tone, and mantenimiento a warning tone", () => {
    expect(printerStatusBadgeClassName("activo")).toMatch(/ok/);
    expect(printerStatusBadgeClassName("inactivo")).toMatch(/destructive/);
    expect(printerStatusBadgeClassName("mantenimiento")).toMatch(/warning/);
  });

  it("falls back to a neutral tone for an unrecognized status", () => {
    expect(printerStatusBadgeClassName("unknown_value")).toMatch(/muted/);
  });
});

describe("isPrinterDimmed", () => {
  it("is false only for activo", () => {
    expect(isPrinterDimmed("activo")).toBe(false);
    expect(isPrinterDimmed("inactivo")).toBe(true);
    expect(isPrinterDimmed("mantenimiento")).toBe(true);
  });
});
