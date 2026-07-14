import { AlertTriangle, CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { AlertPanel } from "@/components/AlertPanel";
import { ReadingCard } from "@/components/ReadingCard";
import { StatusBadge } from "@/components/StatusBadge";
import { describeSensorLocation } from "@/lib/sensorLocation";
import { formatDewPoint, formatHumidity, formatPressure, formatTemperature } from "@/lib/format";
import type { Printer, SensorReadingEntry } from "@/types/api";

interface SensorReadingSectionProps {
  entry: SensorReadingEntry;
  /** Used to relabel an AMS-slot location by its printer ("P1S #1 — AMS")
   * instead of the misleading exact slot name -- one sensor covers a whole
   * AMS module's shared microclimate, not just the slot it's attached to. */
  printers?: Printer[];
}

/** One active sensor's live reading, or its read error, isolated from every
 * other sensor's section -- a failing physical sensor must never hide a
 * healthy mock sensor's data. */
export function SensorReadingSection({ entry, printers = [] }: SensorReadingSectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-medium">{entry.sensor.serial_number}</h2>
          <StatusBadge status={entry.sensor.sensor_type} />
        </div>
        <div className="text-sm text-muted-foreground">
          {entry.timestamp && new Date(entry.timestamp).toLocaleString()}
          {entry.location && (
            <>
              {" "}
              ·{" "}
              <strong className="text-foreground">
                {describeSensorLocation(entry.location, printers)}
              </strong>
            </>
          )}
        </div>
      </div>

      {entry.error ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          Sensor unavailable: {entry.error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReadingCard label="Temperature" value={formatTemperature(entry.temperature_c)} icon={Thermometer} />
            <ReadingCard
              label="Relative Humidity"
              value={formatHumidity(entry.relative_humidity_percent)}
              icon={Droplets}
            />
            <ReadingCard label="Pressure" value={formatPressure(entry.pressure_kpa)} icon={Gauge} />
            <ReadingCard label="Dew Point" value={formatDewPoint(entry.dew_point_c)} icon={CloudFog} />
          </div>

          <AlertPanel alerts={entry.alerts} />
          <AffectedSpoolsPanel spools={entry.affected_spools} />
        </>
      )}
    </div>
  );
}
