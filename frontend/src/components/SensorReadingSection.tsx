import { AlertTriangle, CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { AlertPanel } from "@/components/AlertPanel";
import { ReadingCard } from "@/components/ReadingCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { SensorReadingEntry } from "@/types/api";

/** One active sensor's live reading, or its read error, isolated from every
 * other sensor's section -- a failing physical sensor must never hide a
 * healthy mock sensor's data. */
export function SensorReadingSection({ entry }: { entry: SensorReadingEntry }) {
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
              · <strong className="text-foreground">{entry.location.name}</strong>
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
            <ReadingCard label="Temperature" value={`${entry.temperature_c!.toFixed(1)} °C`} icon={Thermometer} />
            <ReadingCard
              label="Relative Humidity"
              value={`${entry.relative_humidity_percent!.toFixed(1)} %`}
              icon={Droplets}
            />
            <ReadingCard label="Pressure" value={`${entry.pressure_kpa!.toFixed(1)} kPa`} icon={Gauge} />
            <ReadingCard label="Dew Point" value={`${entry.dew_point_c!.toFixed(1)} °C`} icon={CloudFog} />
          </div>

          <AlertPanel alerts={entry.alerts} />
          <AffectedSpoolsPanel spools={entry.affected_spools} />
        </>
      )}
    </div>
  );
}
