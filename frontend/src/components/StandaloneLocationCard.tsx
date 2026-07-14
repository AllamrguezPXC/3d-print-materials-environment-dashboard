import { AlertTriangle, CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { AlertPanel } from "@/components/AlertPanel";
import { DeviceTypeIcon } from "@/components/DeviceTypeIcon";
import { EnvMetricTile } from "@/components/EnvMetricTile";
import { HumidityScale } from "@/components/HumidityScale";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toneForMetric } from "@/lib/deviceModules";
import { formatDewPoint, formatHumidity, formatPressure, formatTemperature } from "@/lib/format";
import type { LocationInfo, SensorReadingEntry } from "@/types/api";

interface StandaloneLocationCardProps {
  location: LocationInfo;
  entries: SensorReadingEntry[];
}

/** A non-printer, sensor-bearing location's device module (room, storage
 * box, dry box, dryer) -- same shell as DeviceModuleCard, minus the
 * filament-slot section (these locations aren't sliced into AMS-style
 * slots). */
export function StandaloneLocationCard({ location, entries }: StandaloneLocationCardProps) {
  const entry = entries.length > 0 ? entries[0] : null;
  const alerts = entries.flatMap((e) => e.alerts);
  const affectedSpools = entries.flatMap((e) => e.affected_spools);

  const hasCritical = entry?.error != null || alerts.some((a) => a.is_active && a.severity === "critical");
  const hasWarning = alerts.some((a) => a.is_active && a.severity === "warning");
  const accentClass = hasCritical ? "bg-destructive" : hasWarning ? "bg-warning" : "bg-ok";
  const dotClass = hasCritical ? "bg-destructive" : hasWarning ? "bg-warning" : "bg-ok";

  return (
    <Card size="sm" className="relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", accentClass)} />
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <DeviceTypeIcon type={location.location_type} kind="location" />
          <span
            className={cn("size-1.5 rounded-full", dotClass, entry?.source === "real" && !entry.error && "animate-pulse")}
            title={entry?.error ? "Sensor unavailable" : "Sensor online"}
          />
        </div>
        <h2 className="font-heading text-sm font-semibold">{location.name}</h2>
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
        ) : null}

        <Separator />
        <AlertPanel alerts={alerts} />
        <AffectedSpoolsPanel spools={affectedSpools} />
      </CardContent>
    </Card>
  );
}
