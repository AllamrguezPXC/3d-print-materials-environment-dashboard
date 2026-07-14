import { describe, expect, it } from "vitest";
import { getAvailableSpools } from "./spoolAvailability";
import type { FilamentSpool, SpoolAssignment } from "@/types/api";

const SPOOL_1: FilamentSpool = { id: 1, material_profile_id: 1, brand: "Generic", color: "Black", diameter_mm: 1.75, status: "ready" };
const SPOOL_2: FilamentSpool = { id: 2, material_profile_id: 1, brand: "Generic", color: "Blue", diameter_mm: 1.75, status: "ready" };
const SPOOL_3: FilamentSpool = { id: 3, material_profile_id: 1, brand: "Generic", color: "Red", diameter_mm: 1.75, status: "watch" };

function assignment(overrides: Partial<SpoolAssignment>): SpoolAssignment {
  return { id: 1, spool_id: 1, location_id: 1, slot_name: null, is_active: true, ...overrides };
}

describe("getAvailableSpools", () => {
  it("excludes spools with an active assignment anywhere in the system", () => {
    const assignments = [assignment({ id: 1, spool_id: 1, location_id: 10 })];

    const result = getAvailableSpools([SPOOL_1, SPOOL_2, SPOOL_3], assignments, null);

    expect(result.map((s) => s.id)).toEqual([2, 3]);
  });

  it("re-includes the spool currently assigned to the slot being edited", () => {
    const assignments = [assignment({ id: 1, spool_id: 1, location_id: 10 })];

    const result = getAvailableSpools([SPOOL_1, SPOOL_2, SPOOL_3], assignments, 1);

    expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it("ignores inactive assignments", () => {
    const assignments = [assignment({ id: 1, spool_id: 1, location_id: 10, is_active: false })];

    const result = getAvailableSpools([SPOOL_1, SPOOL_2], assignments, null);

    expect(result.map((s) => s.id)).toEqual([1, 2]);
  });

  it("returns every spool when there are no assignments", () => {
    const result = getAvailableSpools([SPOOL_1, SPOOL_2, SPOOL_3], [], null);

    expect(result).toHaveLength(3);
  });
});
