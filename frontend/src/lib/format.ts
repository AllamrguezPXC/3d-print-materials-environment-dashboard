const DASH = "—";

/** Centralized 2-decimal formatting for environmental values (Requirements.md
 * dashboard display rules) -- replaces ad hoc `.toFixed(1)` calls that were
 * duplicated across DeviceModuleCard/StandaloneLocationCard/SensorReadingSection/
 * HumidityScale/Sensors.tsx. `null`/`undefined` render as an explicit dash
 * rather than a fabricated 0.00. */
export function formatEnvironmentalValue(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return `${value.toFixed(2)} ${unit}`;
}

export function formatTemperature(value: number | null | undefined): string {
  return formatEnvironmentalValue(value, "°C");
}

export function formatHumidity(value: number | null | undefined): string {
  return formatEnvironmentalValue(value, "%");
}

export function formatPressure(value: number | null | undefined): string {
  return formatEnvironmentalValue(value, "kPa");
}

export function formatDewPoint(value: number | null | undefined): string {
  return formatEnvironmentalValue(value, "°C");
}
