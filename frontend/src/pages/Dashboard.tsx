import { useQuery } from "@tanstack/react-query";
import { CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { AlertPanel } from "@/components/AlertPanel";
import { DryingRecommendationCard } from "@/components/DryingRecommendationCard";
import { ReadingCard } from "@/components/ReadingCard";
import { useDryingRecommendations } from "@/hooks/resources/drying";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";
import { getCurrentReading } from "@/api/readings";

export function Dashboard() {
  const refreshInterval = useRefreshInterval();
  const { data, error, isPending } = useQuery({
    queryKey: ["current-reading"],
    queryFn: getCurrentReading,
    refetchInterval: refreshInterval,
  });
  const { data: recommendations = [] } = useDryingRecommendations();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading current reading…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not reach the backend: {(error as Error)?.message ?? "unknown error"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-xl font-heading font-semibold">Live Environment</h1>
        <div className="text-sm text-muted-foreground">
          {new Date(data.timestamp).toLocaleString()} · source <strong className="text-foreground">{data.source}</strong> ·
          sensor {data.sensor.serial_number}
          {data.location && (
            <>
              {" "}
              · <strong className="text-foreground">{data.location.name}</strong>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReadingCard label="Temperature" value={`${data.temperature_c.toFixed(1)} °C`} icon={Thermometer} />
        <ReadingCard
          label="Relative Humidity"
          value={`${data.relative_humidity_percent.toFixed(1)} %`}
          icon={Droplets}
        />
        <ReadingCard label="Pressure" value={`${data.pressure_kpa.toFixed(1)} kPa`} icon={Gauge} />
        <ReadingCard label="Dew Point" value={`${data.dew_point_c.toFixed(1)} °C`} icon={CloudFog} />
      </div>

      <AlertPanel alerts={data.alerts} />

      <AffectedSpoolsPanel spools={data.affected_spools} />

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Drying Recommendations</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spools currently need drying.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <DryingRecommendationCard key={rec.spool_id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
