import { CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { AlertPanel } from "@/components/AlertPanel";
import { AmsSlotGrid } from "@/components/AmsSlotGrid";
import { Button } from "@/components/ui/button";
import { DeviceTypeIcon } from "@/components/DeviceTypeIcon";
import { EnvMetricTile } from "@/components/EnvMetricTile";
import { ExternalSpoolSlot } from "@/components/ExternalSpoolSlot";
import { HumidityScale } from "@/components/HumidityScale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toneForMetric } from "@/lib/deviceModules";
import { formatDewPoint, formatHumidity, formatPressure, formatTemperature } from "@/lib/format";
import { isPrinterDimmed, PRINTER_OPERATIONAL_STATUSES, printerStatusLabel } from "@/lib/printerStatus";
import { useUpdatePrinter } from "@/hooks/resources/printers";
import type {
  AffectedSpoolInfo,
  AlertOut,
  FilamentSpool,
  Location,
  MaterialProfile,
  Printer,
  SensorReadingEntry,
  SpoolAssignment,
} from "@/types/api";

const DASHBOARD_FILAMENT_SYSTEM_TYPES = ["ams", "external_spool"] as const;

interface DeviceModuleCardProps {
  printer: Printer;
  amsLocations: Location[];
  externalSpoolLocations: Location[];
  sensorEntries: SensorReadingEntry[];
  assignments: SpoolAssignment[];
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  selectedLocationId?: number;
  onSelectSlot: (location: Location) => void;
  onAssignSensor: (printer: Printer) => void;
}

function dedupeById<T>(items: T[], keyOf: (item: T) => number | null): T[] {
  const seen = new Set<number>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (key === null || !seen.has(key)) {
      if (key !== null) seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/** One printer's device module: header, compact environment readout,
 * humidity scale, filament slots (AMS grid and/or external-spool slot(s)),
 * alerts, and affected spools -- composes existing, unmodified components
 * (AmsSlotGrid, HumidityScale, AlertPanel, AffectedSpoolsPanel). */
export function DeviceModuleCard({
  printer,
  amsLocations,
  externalSpoolLocations,
  sensorEntries,
  assignments,
  spools,
  materials,
  selectedLocationId,
  onSelectSlot,
  onAssignSensor,
}: DeviceModuleCardProps) {
  const updatePrinter = useUpdatePrinter();
  const entry = sensorEntries.length > 0 ? sensorEntries[0] : null;
  const alerts: AlertOut[] = dedupeById(
    sensorEntries.flatMap((e) => e.alerts),
    (a) => a.id,
  );
  const affectedSpools: AffectedSpoolInfo[] = dedupeById(
    sensorEntries.flatMap((e) => e.affected_spools),
    (s) => s.spool_id,
  );

  const hasCritical = entry?.error != null || alerts.some((a) => a.is_active && a.severity === "critical");
  const hasWarning = alerts.some((a) => a.is_active && a.severity === "warning");
  const accentClass = hasCritical
    ? "bg-destructive"
    : hasWarning
      ? "bg-warning"
      : entry
        ? "bg-ok"
        : "bg-border";
  const dotClass = hasCritical
    ? "bg-destructive"
    : hasWarning
      ? "bg-warning"
      : entry
        ? "bg-ok"
        : "bg-muted-foreground";

  function resolveSlotSpool(location: Location) {
    const assignment = assignments.find((a) => a.location_id === location.id && a.is_active);
    const spool = assignment ? (spools.find((s) => s.id === assignment.spool_id) ?? null) : null;
    const material = spool ? (materials.find((m) => m.id === spool.material_profile_id) ?? null) : null;
    return { spool, material };
  }

  const dimmed = isPrinterDimmed(printer.operational_status);
  const showsFilamentSystemToggle = (DASHBOARD_FILAMENT_SYSTEM_TYPES as readonly string[]).includes(
    printer.filament_system_type,
  );

  function handleOperationalStatusChange(operational_status: string) {
    updatePrinter.mutate({ id: printer.id, body: { operational_status } });
  }

  function handleFilamentSystemTypeChange(filament_system_type: string) {
    updatePrinter.mutate({ id: printer.id, body: { filament_system_type } });
  }

  return (
    <Card size="sm" className={cn("relative overflow-hidden", dimmed && "opacity-60")}>
      <div className={cn("absolute inset-x-0 top-0 h-1", accentClass)} />
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DeviceTypeIcon type={printer.filament_system_type} kind="filament_system" />
            <span
              className={cn("size-1.5 rounded-full", dotClass, entry?.source === "real" && !entry.error && "animate-pulse")}
              title={entry ? (entry.error ? "Sensor unavailable" : "Sensor online") : "No sensor assigned"}
            />
          </div>
          <Select value={printer.operational_status} onValueChange={handleOperationalStatusChange}>
            <SelectTrigger size="sm" className="h-6 px-2 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRINTER_OPERATIONAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {printerStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-sm font-semibold">{printer.name}</h2>
            <p className="text-xs text-muted-foreground">
              {printer.brand} {printer.model}
            </p>
          </div>
          {showsFilamentSystemToggle && (
            <Select value={printer.filament_system_type} onValueChange={handleFilamentSystemTypeChange}>
              <SelectTrigger size="sm" className="h-6 px-2 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ams">AMS</SelectItem>
                <SelectItem value="external_spool">External Spool</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Separator />

        {entry?.error ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            Sensor unavailable: {entry.error}
          </div>
        ) : entry ? (
          <>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {entry.sensor.serial_number}
                <StatusBadge status={entry.sensor.sensor_type} />
                <button
                  type="button"
                  onClick={() => onAssignSensor(printer)}
                  className="text-primary underline underline-offset-2"
                >
                  Change
                </button>
              </span>
              {entry.timestamp && <span>{new Date(entry.timestamp).toLocaleString()}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EnvMetricTile
                label="Temp"
                value={formatTemperature(entry.temperature_c)}
                icon={Thermometer}
                tone={toneForMetric(alerts, "temperature")}
              />
              <EnvMetricTile
                label="RH"
                value={formatHumidity(entry.relative_humidity_percent)}
                icon={Droplets}
                tone={toneForMetric(alerts, "humidity")}
              />
              <EnvMetricTile
                label="Pressure"
                value={formatPressure(entry.pressure_kpa)}
                icon={Gauge}
                tone={toneForMetric(alerts, "pressure")}
              />
              <EnvMetricTile
                label="Dew Point"
                value={formatDewPoint(entry.dew_point_c)}
                icon={CloudFog}
                tone={toneForMetric(alerts, "dew_point")}
              />
            </div>
            {entry.relative_humidity_percent !== null && (
              <HumidityScale relativeHumidityPercent={entry.relative_humidity_percent} />
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">No sensor assigned to this printer's locations.</p>
            <Button variant="outline" size="sm" onClick={() => onAssignSensor(printer)}>
              + Assign sensor
            </Button>
          </div>
        )}

        <Separator />

        {amsLocations.length > 0 ? (
          <AmsSlotGrid
            amsLocations={amsLocations}
            assignments={assignments}
            spools={spools}
            materials={materials}
            selectedLocationId={selectedLocationId}
            onSelectSlot={onSelectSlot}
          />
        ) : externalSpoolLocations.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {externalSpoolLocations.map((location) => {
              const { spool, material } = resolveSlotSpool(location);
              return (
                <ExternalSpoolSlot
                  key={location.id}
                  location={location}
                  spool={spool}
                  material={material}
                  selected={location.id === selectedLocationId}
                  onClick={() => onSelectSlot(location)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No filament slots configured for this printer.</p>
        )}

        <Separator />
        <AlertPanel alerts={alerts} />
        <AffectedSpoolsPanel spools={affectedSpools} />
      </CardContent>
    </Card>
  );
}
