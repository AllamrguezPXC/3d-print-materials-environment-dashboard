import { useState } from "react";
import { EMPTY_DEVICE_FILTERS, type DeviceFiltersValue } from "@/lib/deviceFilters";

export const DEVICE_FILTERS_STORAGE_KEY = "dashboard-device-filters-v1";

/** Reads the persisted Dashboard filters, merging over EMPTY_DEVICE_FILTERS
 * so a missing/renamed key (e.g. after a future filter-shape change) falls
 * back to its default instead of leaving a field undefined. The version
 * suffix on the storage key means a shape change can just bump the suffix
 * -- an old, incompatible value is then simply absent, not partially
 * recovered. Any malformed JSON is treated the same way. */
export function getStoredDeviceFilters(): DeviceFiltersValue {
  const raw = localStorage.getItem(DEVICE_FILTERS_STORAGE_KEY);
  if (!raw) return EMPTY_DEVICE_FILTERS;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_DEVICE_FILTERS;
    return { ...EMPTY_DEVICE_FILTERS, ...parsed };
  } catch {
    return EMPTY_DEVICE_FILTERS;
  }
}

/** Unlike useRefreshInterval (read-only; Settings.tsx owns the one write
 * site), the Dashboard changes filters directly and constantly, so this
 * hook's setter also persists on every change. */
export function useDeviceFilters() {
  const [filters, setFiltersState] = useState<DeviceFiltersValue>(getStoredDeviceFilters);

  function setFilters(next: DeviceFiltersValue) {
    setFiltersState(next);
    localStorage.setItem(DEVICE_FILTERS_STORAGE_KEY, JSON.stringify(next));
  }

  return [filters, setFilters] as const;
}
