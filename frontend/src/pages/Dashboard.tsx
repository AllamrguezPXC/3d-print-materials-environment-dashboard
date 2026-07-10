import { useQuery } from "@tanstack/react-query";
import { DryingRecommendationCard } from "@/components/DryingRecommendationCard";
import { SensorReadingSection } from "@/components/SensorReadingSection";
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
      <h1 className="text-xl font-heading font-semibold">Live Environment</h1>

      {data.sensors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {data.message ?? "No active sensors configured."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.sensors.map((entry) => (
            <SensorReadingSection key={entry.sensor.id} entry={entry} />
          ))}
        </div>
      )}

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
