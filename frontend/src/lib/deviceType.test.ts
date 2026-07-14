import { describe, expect, it } from "vitest";
import { filamentSystemVisual, locationTypeVisual } from "./deviceType";

describe("filamentSystemVisual", () => {
  it.each(["ams", "external_spool", "ams_external_spool", "storage_only", "manual"])("maps %s to a defined visual", (type) => {
    const visual = filamentSystemVisual(type);
    expect(visual.icon).toBeDefined();
    expect(visual.label.length).toBeGreaterThan(0);
    expect(visual.chipClassName.length).toBeGreaterThan(0);
  });

  it("falls back to Unknown/HelpCircle for an unrecognized value", () => {
    const visual = filamentSystemVisual("something_new");
    expect(visual.label).toBe("Unknown");
  });

  it("does not use severity colors (ok/warning/critical) for any known type", () => {
    for (const type of ["ams", "external_spool", "ams_external_spool", "storage_only", "manual"]) {
      const { chipClassName } = filamentSystemVisual(type);
      expect(chipClassName).not.toMatch(/\b(ok|warning|destructive|critical)\b/);
    }
  });
});

describe("locationTypeVisual", () => {
  it.each(["room", "storage_box", "dry_box", "dryer"])("maps %s to a defined visual", (type) => {
    const visual = locationTypeVisual(type);
    expect(visual.icon).toBeDefined();
    expect(visual.label.length).toBeGreaterThan(0);
  });

  it("falls back to Unknown/HelpCircle for an unrecognized value", () => {
    const visual = locationTypeVisual("spaceship");
    expect(visual.label).toBe("Unknown");
  });
});
