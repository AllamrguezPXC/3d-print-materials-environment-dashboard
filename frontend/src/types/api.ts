export interface SensorInfo {
  id: number;
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

/** Response of PATCH /alerts/{id}/resolve. */
export interface AlertResolveResponse {
  alert: AlertOut;
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

export interface SensorReadingEntry {
  sensor: SensorInfo;
  location_id: number | null;
  location: LocationInfo | null;
  timestamp: string | null;
  temperature_c: number | null;
  relative_humidity_percent: number | null;
  pressure_pa: number | null;
  pressure_kpa: number | null;
  dew_point_c: number | null;
  source: "real" | "mock" | "manual";
  affected_spools: AffectedSpoolInfo[];
  alerts: AlertOut[];
  error: string | null;
}

export interface CurrentReadingsResponse {
  sensors: SensorReadingEntry[];
  message: string | null;
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
  deleted_at: string | null;
}

export interface Printer {
  id: number;
  name: string;
  brand: string;
  model: string;
  serial_number: string | null;
  notes: string | null;
  /** "ams" | "external_spool" | "storage_only" | "manual" -- descriptive
   * configuration only; does not gate the AMS slot grid, which is derived
   * from actual Location rows. */
  filament_system_type: string;
  /** "activo" | "inactivo" | "mantenimiento" -- administrative status only;
   * never gates or suppresses alerts. */
  operational_status: string;
  deleted_at: string | null;
}

export interface Location {
  id: number;
  name: string;
  location_type: string;
  printer_id: number | null;
  description: string | null;
  max_temp_c: number | null;
  notes: string | null;
  /** Only meaningful when location_type === "printer_ams": the slot's stable
   * ordinal (0-based) within its printer's AMS. */
  slot_index: number | null;
  deleted_at: string | null;
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
  deleted_at: string | null;
}

/** One serial port detected on the host, from GET /sensors/ports -- transient
 * OS state, never persisted. */
export interface SensorPortInfo {
  device: string;
  description: string | null;
  hwid: string | null;
}

/** Result of a one-off, non-persisted read attempt (POST /sensors/{id}/test-read). */
export interface SensorTestReadResult {
  success: boolean;
  temperature_c: number | null;
  relative_humidity_percent: number | null;
  pressure_pa: number | null;
  source: string | null;
  error: string | null;
}

export interface FilamentSpool {
  id: number;
  material_profile_id: number;
  brand: string;
  color: string | null;
  diameter_mm: number;
  status: "ready" | "watch" | "needs_drying" | "quarantine" | "unknown";
  deleted_at: string | null;
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

export type DryingSessionStatus = "recommended" | "running" | "completed" | "failed" | "cancelled";

export interface DryingSessionCreate {
  spool_id: number;
  dryer_location_id: number;
  sensor_id?: number | null;
  target_temp_c: number;
  target_duration_hours: number;
}

export interface DryingSessionUpdate {
  status?: DryingSessionStatus;
  ended_at?: string;
  validation_notes?: string;
}

export interface DryingSessionRead {
  id: number;
  spool_id: number;
  dryer_location_id: number;
  sensor_id: number | null;
  target_temp_c: number;
  target_duration_hours: number;
  started_at: string;
  ended_at: string | null;
  status: DryingSessionStatus;
  validation_notes: string | null;
}
