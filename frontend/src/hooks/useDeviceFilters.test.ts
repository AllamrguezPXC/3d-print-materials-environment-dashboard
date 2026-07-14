import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { DEVICE_FILTERS_STORAGE_KEY, getStoredDeviceFilters, useDeviceFilters } from "./useDeviceFilters";
import { EMPTY_DEVICE_FILTERS } from "@/lib/deviceFilters";

beforeEach(() => {
  localStorage.clear();
});

describe("getStoredDeviceFilters", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(getStoredDeviceFilters()).toEqual(EMPTY_DEVICE_FILTERS);
  });

  it("returns the stored value when it round-trips cleanly", () => {
    const stored = { ...EMPTY_DEVICE_FILTERS, search: "PLA", printerBrand: "Bambu Lab" };
    localStorage.setItem(DEVICE_FILTERS_STORAGE_KEY, JSON.stringify(stored));

    expect(getStoredDeviceFilters()).toEqual(stored);
  });

  it("falls back to defaults on malformed JSON", () => {
    localStorage.setItem(DEVICE_FILTERS_STORAGE_KEY, "{not valid json");

    expect(getStoredDeviceFilters()).toEqual(EMPTY_DEVICE_FILTERS);
  });

  it("falls back to defaults when the stored value isn't an object", () => {
    localStorage.setItem(DEVICE_FILTERS_STORAGE_KEY, JSON.stringify("a string, not an object"));

    expect(getStoredDeviceFilters()).toEqual(EMPTY_DEVICE_FILTERS);
  });

  it("merges over defaults so a missing key falls back rather than being undefined", () => {
    localStorage.setItem(DEVICE_FILTERS_STORAGE_KEY, JSON.stringify({ search: "PETG" }));

    expect(getStoredDeviceFilters()).toEqual({ ...EMPTY_DEVICE_FILTERS, search: "PETG" });
  });
});

describe("useDeviceFilters", () => {
  it("persists a change to localStorage and reflects it in the returned state", () => {
    const { result } = renderHook(() => useDeviceFilters());

    act(() => {
      result.current[1]({ ...EMPTY_DEVICE_FILTERS, search: "ABS" });
    });

    expect(result.current[0].search).toBe("ABS");
    expect(JSON.parse(localStorage.getItem(DEVICE_FILTERS_STORAGE_KEY)!).search).toBe("ABS");
  });

  it("reads the persisted value on initial mount", () => {
    localStorage.setItem(
      DEVICE_FILTERS_STORAGE_KEY,
      JSON.stringify({ ...EMPTY_DEVICE_FILTERS, filamentBrand: "Polymaker" }),
    );

    const { result } = renderHook(() => useDeviceFilters());

    expect(result.current[0].filamentBrand).toBe("Polymaker");
  });
});
