export interface SensorInfo {
  serial_number: string;
  model: string;
  sensor_type: "real" | "mock" | "manual";
}

export interface AlertOut {
  id: number | null;
  reading_id: number | null;
  sensor_id: number | null;
  location_id: number | null;
  spool_id: number | null;
  material_profile_id: number | null;
  severity: "info" | "warning" | "critical";
  metric: "temperature" | "humidity" | "pressure" | "dew_point" | "sensor";
  message: string;
  recommended_action: string | null;
  is_active: boolean;
  created_at: string | null;
  resolved_at: string | null;
}

export interface LocationInfo {
  id: number;
  name: string;
  location_type: string;
  printer_id: number | null;
}

export interface AffectedSpoolInfo {
  spool_id: number;
  brand: string;
  color: string | null;
  material_profile_name: string;
  status: string;
}

export interface CurrentReadingResponse {
  timestamp: string;
  temperature_c: number;
  relative_humidity_percent: number;
  pressure_pa: number;
  pressure_kpa: number;
  dew_point_c: number;
  source: "real" | "mock" | "manual";
  sensor: SensorInfo;
  location_id: number | null;
  location: LocationInfo | null;
  affected_spools: AffectedSpoolInfo[];
  alerts: AlertOut[];
}

export interface ReadingOut {
  id: number;
  sensor_id: number;
  location_id: number | null;
  timestamp: string;
  temperature_c: number;
  relative_humidity_percent: number;
  pressure_pa: number;
  pressure_kpa: number;
  dew_point_c: number | null;
  source: string;
}

export interface HourlyAggregate {
  hour: string;
  temperature_c: number;
  relative_humidity_percent: number;
  pressure_pa: number;
  dew_point_c: number | null;
  sample_count: number;
}

export interface ReadingsHistoryResponse {
  readings: ReadingOut[];
  hourly: HourlyAggregate[];
}

/**
 * <summary>
 * Environmental thresholds and drying recommendations for a filament family
 * or manufacturer-specific material. Manufacturer-specific profiles override
 * generic family defaults; thresholds are editable configuration, not
 * permanent hard-coded truth.
 * </summary>
 */
export interface MaterialProfile {
  id: number;
  name: string;
  family: string;
  manufacturer: string | null;
  variant: string | null;
  ideal_temp_min_c: number;
  ideal_temp_max_c: number;
  warning_temp_min_c: number;
  warning_temp_max_c: number;
  critical_temp_min_c: number;
  critical_temp_max_c: number;
  ideal_rh_max_percent: number;
  warning_rh_max_percent: number;
  critical_rh_max_percent: number;
  drying_temp_c: number;
  drying_time_hours_min: number;
  drying_time_hours_max: number;
  storage_notes: string | null;
  drying_notes: string | null;
  source_notes: string | null;
}

export interface Printer {
  id: number;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  notes: string | null;
}

export interface Location {
  id: number;
  name: string;
  location_type: string;
  printer_id: number | null;
  description: string | null;
  max_temp_c: number | null;
  notes: string | null;
}

export interface Sensor {
  id: number;
  name: string;
  model: string;
  serial_number: string;
  sensor_type: string;
  port: string | null;
  is_active: boolean;
  location_id: number | null;
}

export interface FilamentSpool {
  id: number;
  material_profile_id: number;
  brand: string;
  color: string | null;
  diameter_mm: number;
  status: "ready" | "watch" | "needs_drying" | "quarantine" | "unknown";
}

export interface SpoolAssignment {
  id: number;
  spool_id: number;
  location_id: number;
  slot_name: string | null;
  is_active: boolean;
}

export interface DryingRecommendation {
  spool_id: number;
  material_profile_name: string;
  current_status: "ok" | "warning" | "critical";
  drying_temp_c: number;
  drying_time_hours_min: number;
  drying_time_hours_max: number;
  dryer_location_id: number | null;
  dryer_capability_ok: boolean | null;
  dryer_max_temp_c: number | null;
  message: string;
}
