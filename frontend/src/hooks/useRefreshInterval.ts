import { useState } from "react";

export const REFRESH_STORAGE_KEY = "dashboard-refresh-interval-ms";
const DEFAULT_REFRESH_MS = 3000;

export function getStoredRefreshInterval(): number {
  return Number(localStorage.getItem(REFRESH_STORAGE_KEY)) || DEFAULT_REFRESH_MS;
}

/** Reads the refresh interval once per Dashboard mount — matches the
 * "applies on next Dashboard page load" copy shown in Settings. */
export function useRefreshInterval(): number {
  const [interval] = useState(getStoredRefreshInterval);
  return interval;
}
